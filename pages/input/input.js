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
var UPNG = require('../../asset/vendor/upng/UPNG.js');
// 设置
var CODEOK = 200;
var CODEERR = 500;
var companyList = CompanyFun.list();
var recogImgOcrTimer;
var recogImgOcrEnable = false;
var focusStatu = -1;
// 提示音
var innerAudioContext;
var serverAudioSrc = {
    "success": "https://renxingstyle.xyz/media/success.mp3"
};
var localAudioSrc = {
    "success": ""
};
//系统信息
var sysInfo = wx.getSystemInfoSync();
var pixelRatio = sysInfo.pixelRatio;
var screenWidth = sysInfo.windowWidth;
var screenHeight = sysInfo.windowHeight;
// 校验电话号码
function checkPhoneNumber(inVal){
	var myreg = /^[1][3,4,5,6,7,8][0-9]{9}$/;
	return myreg.test(inVal);
}
// 下载音频文件，生成本地路径
function downLoadAudioFile() {
    // 正确
    wx.downloadFile({
        url: serverAudioSrc["success"],
        success: function (res) {
            if (res.statusCode == 200) {
                localAudioSrc["success"] = res.tempFilePath;
            }
        }
    })
}
// 扫描提示
function scanTipFun(handle){
    // 声音提示
    tipVoiceFun(handle);
    // 震动
    wx.vibrateLong();
}
// 成功提示音
function tipVoiceFun(handle) {
    // 音源
    var voiceSrc = localAudioSrc["success"];
    innerAudioContext.src = voiceSrc;
    // 操作
    switch (handle) {
        case "start":
            innerAudioContext.stop();
            innerAudioContext.seek(0);
            innerAudioContext.play();
            break;
        case "pause":
            innerAudioContext.pause();
            break;
        case "stop":
        default:
            innerAudioContext.stop();
            innerAudioContext.seek(0);
    }
}
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}
// 清除输入内容
function clearInputContent(self) {
    self.setData({
        parcelNumber: "",
        phoneNumber: "",
        posNumber: ""
    });
}
// 摄像头显示
function cameraShow(self, flag){
    self.setData({
        cameraShow: flag
    })
}
// 同步录入状态
function syncInputStatu(self, statu) {
    var inputStatu = statu;
    var parcelShow = false;
    var mobileShow = false;
    var positionShow = false;
    var submitShow = false;
    var parcelFocus = false;
    var mobileFocus = false;
    switch (statu) {
        case -1:   // 初始状态
            parcelShow = false;
            mobileShow = false;
            positionShow = false;
            submitShow = false;
            parcelFocus = false;
            mobileFocus = false;
            break;
        case 0: // 全部完成
            parcelShow = true;
            mobileShow = true;
            positionShow = true;
            submitShow = true;
            parcelFocus = false;
            mobileFocus = false;
            break;
        case 1: // 单号
            parcelShow = true;
            mobileShow = false;
            positionShow = false;
            submitShow = false;
            parcelFocus = true;
            mobileFocus = false;
            break;
        case 2: // 手机号
            parcelShow = true;
            mobileShow = true;
            positionShow = false;
            submitShow = false;
            parcelFocus = false;
            mobileFocus = true;
            break;
    }
    // 设置
    self.setData({
        inputStatu: inputStatu,
        parcelShow: parcelShow,
        mobileShow: mobileShow,
        positionShow: positionShow,
        submitShow: submitShow,
        parcelFocus: parcelFocus,
        mobileFocus: mobileFocus
    });
    var isInParcel = (inputStatu == 1);
    if (!isInParcel) {
        nextGoMobile(self, false);
    }
    scanImgStart(self, false);
}
// 下一步
function nextGoMobile(self, flag) {
    self.setData({
        goMobileShow: flag
    });
}
// 切换输入行
function switchInputRow(self, statu) {
    var inputStatu = statu;
    var parcelShow = false;
    var mobileShow = false;
    var positionShow = false;
    var submitShow = false;
    switch (statu) {
        case -1:   // 初始状态
            parcelShow = false;
            mobileShow = false;
            positionShow = false;
            submitShow = false;
            break;
        case 0: // 全部完成
            parcelShow = true;
            mobileShow = true;
            positionShow = true;
            submitShow = true;
            break;
        case 1: // 单号
            parcelShow = true;
            mobileShow = false;
            positionShow = false;
            submitShow = false;
            break;
        case 2: // 手机号
            parcelShow = true;
            mobileShow = true;
            positionShow = false;
            submitShow = false;
            break;
    }
    // 设置
    self.setData({
        parcelShow: parcelShow,
        mobileShow: mobileShow,
        positionShow: positionShow,
        submitShow: submitShow,
    });
}

/************ 初始加载 ***********/

// 判断是否允许录入
function checkIsAllowInput(self, callback) {
    var inData = new getInData();
    wx.request({
        url: Server["parcelSum"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    var allSmsCount = dataObj["smsCount"];
                    if (allSmsCount > 0) {
                        if (typeof callback != "undefined") {
                            callback();
                        }
                    } else {
                        wx.showModal({
                            title: '提示',
                            content: '余额不足，请充值',
                            showCancel: false,
                            success: function (res) {
                                wx.redirectTo({
                                    url: AppPages.pageWallet
                                })
                            }
                        });
                    }
                    break;
                default:
                    var msg = jsonData['msg'];
                    wxShowToast({
                        title: msg,
                        flag: "fail"
                    });
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
            wxShowToast({
                title: "加载失败",
                flag: "fail"
            });
        }
    })
}
// 任务单信息
function loadBatchInfo(self) {
	wx.showLoading({
		title: '加载中...',
	});
	var inData = new getInData();
	inData.batchId = self.data.batchId;
	wx.request({
		url: Server["batchInfo"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
					setBatchInfo(self, dataObj);
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: msg,
						flag: "fail"
					});
			}
		},
		fail: function (err) {
			wx.hideLoading();
			console.log(err);
		}
	})
}
// 设置
function setBatchInfo(self, data) {
	var jsonData = data;
	var theCompanyId = jsonData["fastName"];
	var companyInfo = CompanyFun.get(theCompanyId);
	self.setData({
        companyId: theCompanyId,
		companyLogo: companyInfo["logo"],
		companyName: companyInfo["name"]
	});
	// 计算是否完成
	var parcelCount = parseInt(jsonData["parcelCount"]);
	var completeCount = parseInt(jsonData["completeCount"]);
	var notCount = parcelCount - completeCount;
	notCount = (notCount <= 0) ? 0 : notCount;
	var countCurrent = completeCount + 1;
	countCurrent = (countCurrent > parcelCount) ? parcelCount : countCurrent;
	if (notCount <= 0){
		// 已录完
		wx.navigateBack({
			delta: 1
		});
	}else{
		// 设置
		self.setData({
			countNot: notCount,
			countCurrent: countCurrent,
			countAll: parcelCount
		});
        // 同步状态
        syncInputStatu(self, 1);
	}
}

/************** 识别图像 *************/

// 扫描图片开始
function scanImgStart(self, flag) {
    recogImgOcrEnable = flag;
    clearTimeout(recogImgOcrTimer);
    // 打开
    if (recogImgOcrEnable) {
        // 授权
        wx.getSetting({
            success: function (res) {
                if (!res.authSetting['scope.camera']) {
                    wx.authorize({
                        scope: 'scope.camera',
                        success: function (res) {
                            console.log("scope.camera: ok");
                        },
                        fail: function (err) {
                            console.log("scope.camera: fail");
                            console.log(err);
                            wx.showModal({
                                title: '提示',
                                content: '扫一扫需要设置摄像头功能',
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
                    if (recogImgOcrEnable) {
						cameraShow(self, true);
                        recogImgOcrTimer = setTimeout(function () {
                            startRecogImgOcr(self);
                        }, 500);
                    }
                }
            }
        });
    }
	// 关闭
	else{
		cameraShow(self, false);
	}
}
// 启动识别图片
function startRecogImgOcr(self) {
    clearTimeout(recogImgOcrTimer);
    if (!self.data.cameraShow) { return; }
    var cameraCtx = wx.createCameraContext();
    cameraCtx.takePhoto({
        quality: 'high',
        success: function (res) {
            var imgFile = res.tempImagePath;
            drawImgToCanvas(self, imgFile);
        },
        complete: function(res){ }
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
function imgDataRgbaToGray(data){
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
function drawImgToCanvas(self, imgsrc){
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
	ctx.draw(false, function(){
        // 提取像素矩阵
        wx.canvasGetImageData({
            canvasId: canvasId,
            x: scanFrame.offX,
            y: scanFrame.offY,
            width: scanFrame.width,
            height: scanFrame.height,
            success: function(res) {
                // iOS 需调换头尾数据
                if (sysInfo["platform"] == "ios"){
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
            fail: function(err){ console.log(err);}
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
                    if (recogImgOcrEnable) {
                        recogImgOcrTimer = setTimeout(function () {
                            startRecogImgOcr(self);
                        }, 200);
                    }
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
            scanImgStart(self, false);
        }
    })
}
// 识别成功
function recogMobileSuccess(self, data){
    var jsonData = data;
    var phoneNumber = jsonData["mobile"];
    scanImgStart(self, false);
    self.setData({
        phoneNumber: MobileFun.fat(phoneNumber)
    });
    // 提示
    scanTipFun("start");
    // 状态
    syncInputStatu(self, 3);
    // 获取位置编号
    getParcelPosCode(self);
}

Page({
    data:{
        inputStatu: -1,
        cameraShow: false,
        parcelShow: false,
        goMobileShow: false,
        mobileShow: false,
        positionShow: false,
        submitShow: false,
        parcelFocus: false,
        mobileFocus: false,
        parcelClearShow: false,
        mobileClearShow: false,
		batchId: "",
        companyId: "",
		companyLogo: "",
		companyName: "",
		parcelNumber: "",
		phoneNumber: "",
		posNumber: "",
		countNot: 0,
		countCurrent: 0,
        countAll: 0
    },
    onLoad: function (options) {
        var self = this;
        // 下载音频文件
        downLoadAudioFile();
        // 创建音频上下文
        innerAudioContext = wx.createInnerAudioContext();
        // 系统信息
        wx.getSystemInfo({
            success: function (res) {
                screenWidth = res.windowWidth;
                screenHeight = res.windowHeight;
            }
        });
		clearInputContent(self);
        scanImgStart(self, false);
        syncInputStatu(self, -1);
        nextGoMobile(self, false);
        // 加载
		if (typeof (options["batchid"]) != "undefined"){
			var theBatchId = options["batchid"];
			self.setData({
				batchId: theBatchId
			});
            // 检查是否允许
            checkIsAllowInput(self, function(){
                // 获取任务信息
                loadBatchInfo(self);
            });
		}else{
			wxShowToast({
				title: "无效的快递录入任务",
				flag: "fail"
			});
			// 返回
			wx.navigateBack({
				delta: 1
			});
		}
    },
    onUnload: function (e) {
        innerAudioContext.destroy();
    },
    onShow: function(e){
        clearTimeout(recogImgOcrTimer);
    },
    onHide: function(e){
        clearTimeout(recogImgOcrTimer);
    },
    onParcelFocus: function(e){
        var self = this;
        var inValue = self.data.parcelNumber;
        var clearShow = (inValue.length > 0);
        switchInputRow(self, 1);
        self.setData({
            parcelClearShow: clearShow
        });
        nextGoMobile(self, clearShow);
        scanImgStart(self, false);
        focusStatu = 1;
    },
    onParcelBlur: function(e){
        var self = this;
        var theStatu = self.data.inputStatu;
        var isInParcel = (theStatu == 1);
        var isInMobile = (theStatu == 2);
        if (!isInParcel) {
            nextGoMobile(self, false);
        }
        self.setData({
            parcelClearShow: false
        });
        focusStatu = -1;
        switchInputRow(self, theStatu);
    },
    clearParcelNumber: function(e){
        var self = this;
        self.setData({
            parcelNumber: "",
            parcelFocus: true,
            parcelClearShow: false
        });
        nextGoMobile(self, false);
    },
    parcelGoMobile: function(e){
        var self = this;
        var inParcelNumber = self.data.parcelNumber;
        do {
            if (inParcelNumber == "") {
                wx.showModal({
                    title: '提示',
                    content: '快递单号不能为空',
                    showCancel: false
                });
                self.setData({
                    parcelFocus: true
                });
                break;
            }
            // 切换号码
            nextGoMobile(self, false);
            syncInputStatu(self, 2);
        } while (0);
    },
    onMobileFocus: function (e) {
        var self = this;
        var inValue = self.data.phoneNumber;
        var clearShow = (inValue.length > 0);
        switchInputRow(self, 2);
        self.setData({
            phoneNumber: MobileFun.fat(inValue),
            mobileClearShow: clearShow
        });
        focusStatu = 2;
    },
    onMobileBlur: function (e) {
        var self = this;
        var theStatu = self.data.inputStatu;
        var isInMobile = (theStatu == 2);
        var inValue = self.data.phoneNumber;
        self.setData({
            phoneNumber: MobileFun.fat(inValue),
            mobileClearShow: false
        });
        switchInputRow(self, theStatu);
        focusStatu = -1;
    },
    clearPhoneNumber: function (e) {
        var self = this;
        self.setData({
            phoneNumber: "",
            mobileFocus: true,
            mobileClearShow: false
        });
    },
    scanStart: function (e) {
        var self = this;
        var statu = self.data.inputStatu;
        if (statu == 1 || focusStatu == 1) {
            scanParcelNumber(self);
        }
        else if (statu == 2 || focusStatu == 2) {
            scanImgStart(self, true);
        }
    },
    scanClose: function (e) {
        var self = this;
        scanImgStart(self, false);
    },
	inputParcelNumber: function(e){
        var self = this;
        var inValue = e.detail.value;
        var clearShow = (inValue.length > 0);
        self.setData({
            parcelNumber: inValue,
            parcelClearShow: clearShow
		});
        nextGoMobile(self, clearShow);
	},
	inputPhoneNumber: function (e) {
        var self = this;
        var inValue = e.detail.value;
        inValue = MobileFun.reset(inValue);
        inValue = (inValue.length > 11) ? inValue.slice(0, 11) : inValue;
        var clearShow = (inValue.length > 0);
        self.setData({
            phoneNumber: MobileFun.fat(inValue),
            mobileClearShow: clearShow
        });
        if (checkPhoneNumber(inValue)) {
            // 获取位置编号
            getParcelPosCode(self);
        }
	},
	addParcel: function (e) {
		var self = this;
		var inParcelNumber = self.data.parcelNumber;
		var inPhoneNumber = self.data.phoneNumber;
        inPhoneNumber = MobileFun.reset(inPhoneNumber);
		do {
			if (inParcelNumber == "") {
				wx.showModal({
					title: '提示',
					content: '快递单号不能为空',
					showCancel: false
				})
				break;
			}
			if (inPhoneNumber == "") {
				wx.showModal({
					title: '提示',
					content: '手机号码不能为空',
					showCancel: false
				})
				break;
			}
			if (!checkPhoneNumber(inPhoneNumber)) {
				wx.showModal({
					title: '提示',
					content: '请填写正确的手机号',
					showCancel: false
				})
				break;
			}
            // 提交服务器
            submitParcel(self);
		} while (0);
	}
});

// 扫描单号
function scanParcelNumber(self){
    wx.scanCode({
        onlyFromCamera: true,
        success: function (res) {
            self.setData({
                parcelNumber: res["result"]
            });
            setTimeout(function(){
                // 提示
                scanTipFun("start");
            }, 500);
            syncInputStatu(self, 2);
        },
        fail: function (err) {
            console.log(err);
        }
    });
}
// 获取包裹位置编号
function getParcelPosCode(self) {
	wx.showLoading({
		title: '加载中...',
	});
	var inData = new getInData();
	inData.fastName = self.data.companyId;
	wx.request({
		url: Server["getParcelPosition"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
                    self.setData({
                        posNumber: dataObj["positionCode"]
                    });
                    syncInputStatu(self, 0);
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: "获取位置编码失败",
						flag: "fail"
					});
			}
		},
		fail: function (err) {
			wx.hideLoading();
			console.log(err);
			wxShowToast({
                title: "加载失败",
				flag: "fail"
			});
		}
	})
}
// 提交新包裹
function submitParcel(self){
	var inData = new getInData();
	inData.batchId = self.data.batchId;
    inData.fastName = self.data.companyId;
	inData.parcelNumber = self.data.parcelNumber;
    inData.mobile = MobileFun.reset(self.data.phoneNumber);
	inData.positionCode = self.data.posNumber;
	do {
		if (inData.positionCode == "") {
			wx.showModal({
				title: '提示',
				content: '位置编码不能为空',
				showCancel: false
			})
			break;
		}
		// 提交
		wx.showLoading({
			title: '加载中...',
		})
		wx.request({
			url: Server["submitParcel"] + "?openId=" + UserIdFun.get(),
			method: "POST",
			data: inData,
			success: function (res) {
				wx.hideLoading();
				var jsonData = res.data;
				var dataObj = jsonData['data'];
				var code = jsonData['code'];
				switch (code) {
					case CODEOK:
						wxShowToast({
							title: "录入成功",
							flag: "success"
						});
						updateBatchInfo(self, dataObj);
						break;
					default:
						var msg = jsonData['msg'];
                        // 判断
                        wx.showModal({
                            title: '提示',
                            content: msg,
                            showCancel: false,
                            success: function (res) {
                                var msgRecharge = "请充值";
                                var isNeedRecharge = (msg.indexOf(msgRecharge) != -1);
                                if (isNeedRecharge){
                                    wx.redirectTo({
                                        url: AppPages.pageWallet
                                    });
                                }
                            }
                        });
				}
			},
			fail: function (err) {
				wx.hideLoading();
				console.log(err);
				wxShowToast({
					title: "录入失败",
					flag: "fail"
				});
			}
		})
	} while (0);
}
// 更新任务单信息
function updateBatchInfo(self, data){
	var jsonData = data;
	// 计算是否完成
	var parcelCount = parseInt(jsonData["parcelCount"]);
	var completeCount = parseInt(jsonData["completeCount"]);
	var notCount = parcelCount - completeCount;
	notCount = (notCount <= 0) ? 0 : notCount;
	completeCount = (notCount <= 0) ? parcelCount : completeCount;
	var countCurrent = completeCount + 1;
	countCurrent = (countCurrent > parcelCount) ? parcelCount : countCurrent;
	// 设置
	self.setData({
		countNot: notCount,
		countCurrent: countCurrent,
		countAll: parcelCount
	});
	//判断是否全部录入完成
	if (notCount == 0) {
		// 已录完
		wx.showModal({
			title: '提示',
			content: '已经录入完成全部快递包裹',
			showCancel: false,
			success: function (res) {
				if (res.confirm) {
					// 跳转首页
                    wx.reLaunch({
						url: AppPages.pageIndex
					});
				} else if (res.cancel) {}
			}
		})
	}else{
        // 检查是否允许继续录入
        checkIsAllowInput(self, function(){
            clearInputContent(self);
            syncInputStatu(self, 1);
        });
    }
}

/*************** 识别语音 *******************/

// 语音识别
function recogniAudio(fileUrl, self) {
    wx.uploadFile({
        url: Server["audioCover"] + "?openId=" + UserIdFun.get(),
        method: "POST",
        filePath: fileUrl,
        name: 'audio',
        success: function (res) {
			wx.hideLoading();
			var jsonData = JSON.parse(res.data);
			console.log(jsonData);
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (parseInt(code)) {
				case CODEOK:
                    var mobile = MobileFun.fat(dataObj["mobile"]);
					self.setData({
                        phoneNumber: mobile
					});
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: "未识别到手机号码",
						flag: "fail"
					});
			}
        },
        fail: function (err) {
			wx.hideLoading();
            console.log(err);
        }
    });
}
// 识别语音
function recogniPhoneNumber(){
    var self = this;
	// 录音授权
	wx.getSetting({
		success: function(res) {
			if (!res.authSetting['scope.record']) {
				wx.authorize({
					scope: 'scope.record',
					success: function (res) {
						console.log("scope.record: ok");
					},
					fail: function (err) {
						console.log("scope.record: fail");
						console.log(err);
						wx.showModal({
							title: '提示',
							content: '念号码需要设置录音功能',
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
					
                var canUseRecorder = wx.canIUse('getRecorderManager') && (typeof (wx.getRecorderManager().start) != null);
                var mang = wx.getRecorderManager();
                mang = {};
                console.log(typeof (mang.start));

                if (!canUseRecorder) {
					// 使用 wx.startRecord
					var recordTimer;
					self.setData({
						phoneNumber: ""
					});
					wx.startRecord({
						success: function (res) {
							console.log(res);
							var tempFilePath = res.tempFilePath;
							recogniAudio(tempFilePath, self);
						},
						fail: function (res) {
							//录音失败
							console.log(res);
						}
					})
					if (recordTimer){
						clearTimeout(recordTimer);
					}
					recordTimer = setTimeout(function () {
						//结束录音  
						wx.stopRecord();
					}, 5000);
				}
				else{
					// 使用 getRecorderManager
					var recorderManager = wx.getRecorderManager();
                    console.log(recorderManager);
					recorderManager.onStart(function () {
						console.log('recorder start');
						self.setData({
							phoneNumber: ""
						});
					});
					recorderManager.onStop(function (res) {
						console.log('recorder stop', res);
						var tempFilePath = res["tempFilePath"];
						recogniAudio(tempFilePath, self);
					});
					var options = {
						duration: 5000,
						sampleRate: 16000,
						numberOfChannels: 1,
						encodeBitRate: 96000,
						format: 'aac',
						frameSize: 50
					};
					recorderManager.start(options);
				}
			}
		}
	});
}
