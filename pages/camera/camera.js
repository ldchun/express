var config = require('../../config.js');
var common = require('../../asset/js/common.js');
var Server = config.service;
var Session = common.Session;
var AppPages = common.AppPages;
var UserIdFun = common.UserIdFun;
var wxShowToast = common.wxShowToast;
var DateFun = new common.DateFun;
var CompanyFun = new common.CompanyFun;
var MobileFun = common.MobileFun;
var CheckFun = common.CheckFun;
var ImgOCRFun = common.ImgOCRFun;
var UPNG = require('../../asset/vendor/upng/UPNG.js');
// 设置
var CODEOK = 200;
var CODEERR = 500;
var recogImgOcrTimer;
var recogImgOcrEnable = false;
// 系统信息
var sysInfo = wx.getSystemInfoSync();
var pixelRatio = sysInfo.pixelRatio;
var screenWidth = sysInfo.windowWidth;
var screenHeight = sysInfo.windowHeight;
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}

/************** 识别图像 *************/

// 相机授权
function allowAuthSettingCamera(self, callback){
    // 授权
    wx.getSetting({
        success: function (res) {
            if (!res.authSetting['scope.camera']) {
                wx.authorize({
                    scope: 'scope.camera',
                    success: function (res) {
                        console.log("scope.camera: ok");
                        // 回调
                        if (typeof (callback) != 'undefined') {
                            callback();
                        }
                    },
                    fail: function (err) {
                        console.log("scope.camera: fail");
                        console.log(err);
                        wx.showModal({
                            title: '提示',
                            content: '扫一扫需要设置摄像头',
                            showCancel: false,
                            success: function (res) {
                                wx.openSetting({
                                    success: function (res) {
                                        console.log("openSetting : ok");
                                    },
                                    fail: function (res) {
                                        console.log("openSetting : err");
                                    }
                                })
                            }
                        })
                    }
                });
            }
            else {
                // 回调
                if (typeof (callback) != 'undefined') {
                    callback();
                }
            }
        }
    });
}
// 启动识别图片
function startRecogImgOcr(self) {
    if (!self.data.imgOCREnable) { return; }
    // 拍照
    self.data.cameraCtx.takePhoto({
        quality: 'high',
        success: function (res) {
            var imgFile = res.tempImagePath;
            drawImgToCanvas(self, imgFile);
        },
        complete: function (res) { }
    });
}
// 颠倒图片数据
function reverseImgData(res) {
    var w = res.width;
    var h = res.height;
    for (var i = 0; i < h / 2; i++) {
        for (var j = 0; j < w * 4; j++) {
            var con = 0;
            con = res.data[i * w * 4 + j];
            res.data[i * w * 4 + j] = res.data[(h - i - 1) * w * 4 + j];
            res.data[(h - i - 1) * w * 4 + j] = con;
        }
    }
    return res;
}
// rgba -> gray
function imgDataRgbaToGray(data) {
    var imgData = data;
    var index = 255 / 2;    //阈值
    for (var i = 0; i < imgData.length; i += 4) {
        var R = imgData[i];     //R(0-255)
        var G = imgData[i + 1]; //G(0-255)
        var B = imgData[i + 2]; //B(0-255)
        var Alpha = imgData[i + 3]; //Alpha(0-255)
        var sum = (R + G + B) / 3;
        var gray = (sum > index) ? 255 : 0;
        imgData[i] = gray;
        imgData[i + 1] = gray;
        imgData[i + 2] = gray;
        imgData[i + 3] = Alpha;
    }
    return imgData;
}
// 图片到画布
function drawImgToCanvas(self, imgsrc) {
    var canvasId = 'myCanvas';
    var imgSrc = imgsrc;
    var imgSuffix = imgsrc.slice(imgsrc.lastIndexOf("."));
    var canvasInfo = {
        width: screenWidth,
        height: screenHeight
    };
    var scanFrame = {
        width: 300,
        height: 120,
        offX: (screenWidth - 300) / 2,
        offY: 80
    };
    var ctx = wx.createCanvasContext(canvasId);
    ctx.clearRect(0, 0, canvasInfo.width, canvasInfo.height);
    // 底色白色
    ctx.beginPath();
    ctx.rect(0, 0, canvasInfo.width, canvasInfo.height);
    ctx.setFillStyle('#FFFFFF');
    ctx.fill();
    ctx.closePath();
    // 图片
    var imgInfo = {
        src: imgSrc,
        width: scanFrame.width,
        height: scanFrame.height
    };
    ctx.beginPath();
    ctx.drawImage(imgInfo.src, 0, 0, canvasInfo.width, canvasInfo.height);
    ctx.closePath();
    // 画
    ctx.draw(false, function () {
        // 提取像素矩阵
        wx.canvasGetImageData({
            canvasId: canvasId,
            x: scanFrame.offX,
            y: scanFrame.offY,
            width: scanFrame.width,
            height: scanFrame.height,
            success: function (res) {
                // iOS 需调换头尾数据
                if (sysInfo["platform"] == "ios") {
                    res = reverseImgData(res);
                }
                //  转换 灰度值
                var grayData = imgDataRgbaToGray(res.data);
                // 转换 png
                var pngBuffer = UPNG.encode([grayData.buffer], res.width, res.height);
                // 转换 base64
                var base64Data = wx.arrayBufferToBase64(pngBuffer);
                var base64Img = "data:image/jpeg;base64," + base64Data;
                // 识别
                recogImgOcrMobile(self, base64Data);
            },
            fail: function (err) { console.log(err); }
        });
    });
}
// 图片识别号码
function recogImgOcrMobile(self, imgData) {
    var inData = new getInData();
    wx.request({
        url: Server["extractMobile"] + "?openId=" + UserIdFun.get(),
        method: "POST",
        data: imgData,
        header: { 'content-type': 'text/plain' },
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            console.log(jsonData);
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    // 结果
                    recogMobileSuccess(self, dataObj);
                    break;
                default:
                    var msg = jsonData['msg'];
                    // OCR继续
                    imgOCRGoOn(self, 200);
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
            // 关闭
            imgOCREnable(self, false);
        }
    })
}
// 识别成功
function recogMobileSuccess(self, data) {
    var jsonData = data;
    var result = jsonData["mobile"];
    // 关闭
    imgOCREnable(self, false);
    // 保存识别内容
    ImgOCRFun.set(result);
    // 退出
    wx.navigateBack({
        delta: 1
    })
}

/************ OCR ***************/

// OCR使能 开启\关闭
function imgOCREnable(self, flag){
    self.setData({
        imgOCREnable: flag
    });
    clearTimeout(self.data.imgOCRTimer);
}
// OCR继续
function imgOCRGoOn(self, delay) {
    if (self.data.imgOCREnable) {
        var delayMs = (typeof (delay) != "undefined") ? delay : 500;
        self.data.imgOCRTimer = setTimeout(function () {
            clearTimeout(self.data.imgOCRTimer);
            startRecogImgOcr(self);
        }, delayMs);
    }
}
// OCR开始 启动\停止
function imgOCRStart(self, flag, delay){
    // 使能
    imgOCREnable(self, flag);
    // 开启
    if(flag){
        imgOCRGoOn(self, delay);
    }
}

Page({
    data:{
        cameraCtx: null,
		imgOCRTimer: null,
        imgOCREnable: false
    },
    onLoad: function (options) {
        var self = this;
        self.setData({
            cameraCtx: wx.createCameraContext()
        });
        // 清除OCR内容
        ImgOCRFun.clear();
        // 相机授权
        allowAuthSettingCamera(self, function(){
            // 开启识别
            imgOCRStart(self, true, 500);
        });
    },
    onUnload: function (e) {
        var self = this;
        self.setData({
            cameraCtx: null
        });
        // 关闭
        imgOCREnable(self, false);
    },
	onShow: function (e) {
		var self = this;
        imgOCRGoOn(self, 500);
	},
    onHide: function (e) {
        var self = this;
        clearTimeout(self.data.imgOCRTimer);
    },
    cameraClose: function (e) {
        var self = this;
        wx.navigateBack({
            delta: 1
        })
    }
});