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
var HintFun = common.HintFun;
var ImgOCRFun = common.ImgOCRFun;
var UPNG = require('../../asset/vendor/upng/UPNG.js');
// 设置
var CODEOK = 200;
var CODEERR = 500;
var recogImgOcrTimer;
var recogImgOcrEnable = false;
// 快递
var companyList = [];
var companyArr = [];
// 提示音
var innerAudioContext;
// 提示音操作函数
var scanTipFun;
var audioNumberTip;
//系统信息
var sysInfo = wx.getSystemInfoSync();
var pixelRatio = sysInfo.pixelRatio;
var screenWidth = sysInfo.windowWidth;
var screenHeight = sysInfo.windowHeight;
// 录音
var recordFun = wx.getRecorderManager();
var recordOpt = {
    duration: 30000,
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 48000,
    format: 'mp3',
    frameSize: 50
}
// ScopeRecord
function checkScopeRecord(callback) {
    callback = (typeof (callback) == 'function') ? callback : function(){};
    // 授权
    wx.getSetting({
        success: function (res) {
            if (!res.authSetting['scope.record']) {
                // not set record
                wx.authorize({
                    scope: 'scope.record',
                    success: function (res) {
                        console.log("scope.record: ok");
                        callback();
                    },
                    fail: function (err) {
                        console.log("scope.record: fail");
                        console.log(err);
                        wx.showModal({
                            title: '提示',
                            content: '语音输入电话号码需要打开录音功能',
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
                // has set
                callback();
            }
        }
    });
}
function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}
//数组元素下标
function indexOfArray(arr, val) {
    if (!Array.indexOf) {
        Array.prototype.indexOf = function (el) {
            var index = -1;
            for (var i = 0, n = this.length; i < n; i++) {
                if (this[i] === el) {
                    index = i;
                    break;
                }
            }
            return index;
        }
    }
    return arr.indexOf(val);
}
// 快递公司 id
function fatCompanyAutoId(id) {
    var idMap = {
        "yuantong": "yuantong",
        "zhongtong": "zhongtong",
        "yunda": "yunda",
        "huitong": "baishi",
        "shentong": "shentong",
        "shunfeng": "shunfeng",
        "post": "youzheng",
        "tiantian": "tiantian",
        "jindong": "jindong",
        "ems": "ems",
        "debang": "debang"
    };
    var idVal = idMap[id];
    return (typeof (idVal) != "undefined") ? idVal : false;
}
// 自动识别快递公司
function discernCompanyAuto(self, callback) {
    var inData = new getInData();
    inData.parcelNumber = self.data.parcelNumber;
    wx.request({
        url: Server["getFastInfo"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            var index = 0;
            switch (code) {
                case CODEOK:
                    var companyId = dataObj["fastName"];
                    if (typeof (CompanyFun.get(companyId)) != "undefined") {
                        var companyName = CompanyFun.get(companyId)["name"];
                        var theIndex = indexOfArray(companyArr, companyName);
                        index = (theIndex != -1) ? theIndex : index;
                    }
                    // 填充选择器列表
                    loadPickerPopList(self, index);
                    pickerPopShow(self, false);
                    // 回调
                    if (typeof (callback) != "undefinded") {
                        callback();
                    }
                    break;
                default:
                    var msg = jsonData['msg'];
                    // 填充选择器列表
                    loadPickerPopList(self, index);
                    pickerPopShow(self, true);
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
        }
    })
}
// 清除输入内容
function clearInputContent(self) {
    self.setData({
        companyArray: [],
        companyIndex: 0,
        parcelNumber: "",
        phoneNumber: "",
        posNumber: "",
        popShow: false,
        pickerIndex: [0]
    });
}
// 摄像头显示
function cameraShow(self, flag){
    self.setData({
        cameraShow: flag
    })
}
// 是否为单号输入
function isInputParcel(self){
    var inputStatu = self.data.inputStatu;
    var focusStatu = self.data.focusStatu;
    return ((inputStatu == 1) || (focusStatu == 1));
}
// 是否为电话输入
function isInputMobile(self) {
    var inputStatu = self.data.inputStatu;
    var focusStatu = self.data.focusStatu;
    return ((inputStatu == 2) || (focusStatu == 2));
}
// 同步光标聚焦状态
function syncFocusStatu(self, statu){
    // 设置
    self.setData({
        focusStatu: statu
    });
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
    // 聚焦
    if ((inputStatu == 0) || (inputStatu == -1)){
        syncFocusStatu(self, -1);
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
// 相机授权
function allowAuthSettingCamera(self, callback) {
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
// 图片OCR电话号码成功
function imgOCRMobileSuccess(self, data) {
    var phoneNumber = data;
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
/* 选择器 */
// 弹窗显示
function pickerPopShow(self, flag) {
    if(flag){
        self.setData({
            pickerIndex: [self.data.companyIndex]
        });
    }
    // 设置
    self.setData({
        popShow: flag
    });
}
// 加载时间选择器
function loadPickerPopList(self, index) {
    var arrIndex = (typeof (index) != "undefined") ? index : self.data.companyIndex;
    // 设置
    self.setData({
        companyArray: companyArr,
        companyIndex: arrIndex,
        pickerIndex: [arrIndex]
    });
}
function linkPageCamera(self) {
    // 清除OCR内容
    ImgOCRFun.clear();
    //  相机授权
    allowAuthSettingCamera(self, function(){
        // 跳转相机页面
        wx.navigateTo({
            url: AppPages.pageCamera
        })
    });
}

Page({
    data:{
        inputStatu: -1,
        focusStatu: -1,
        companyArray: [],
        companyIndex: 0,
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
        parcelPos: true,
        mobilePos: true,
        aipPopShow: false,
        aipAnimShow: false,
		batchId: "",
        companyId: "",
		companyLogo: "",
		companyName: "",
		parcelNumber: "",
		phoneNumber: "",
		posNumber: "",
		countNot: 0,
		countCurrent: 0,
        countAll: 0,
        popShow: false,
        pickerIndex: [0]
    },
    onLoad: function (options) {
        var self = this;
        // 清除OCR内容
        ImgOCRFun.clear();
        // 参数
        companyList = CompanyFun.list();
        companyArr = CompanyFun.arr();
        // 创建音频上下文
        innerAudioContext = wx.createInnerAudioContext();
        scanTipFun = function (handle) {
            HintFun.hint(innerAudioContext, handle);
        };
        audioNumberTip = function (handle, file) {
            HintFun.audio(innerAudioContext, handle, file);
        };
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
        syncFocusStatu(self, -1);
        nextGoMobile(self, false);
        // 检查是否允许
        checkIsAllowInput(self, function(){
            // 进入录入状态
            syncInputStatu(self, 1);
        });
    },
    onUnload: function (e) {
        var self = this;
        innerAudioContext.destroy();
        // 清除OCR内容
        ImgOCRFun.clear();
    },
    onShow: function(e){
        var self = this;
        clearTimeout(recogImgOcrTimer);
        // 检查OCR结果
        if (isInputMobile(self)) {
            // 当前为电话输入
            var imgOcrRes = ImgOCRFun.get();
            if (imgOcrRes) {
                imgOCRMobileSuccess(self, imgOcrRes);
            }
        }
    },
    onHide: function(e){
        clearTimeout(recogImgOcrTimer);
    },
    loadCompanyPicker: function(e){
        var self = this;
        pickerPopShow(self, true);
    },
    pickerPopCancle: function (e) {
        var self = this;
        pickerPopShow(self, false);
    },
    pickerPopOk: function (e) {
        var self = this;
        pickerPopShow(self, false);
        // 设置
        self.setData({
            companyIndex: self.data.pickerIndex[0]
        });
        // 切换号码输入
        nextGoMobile(self, false);
        syncInputStatu(self, 2);
    },
    pickerPopChange: function(e){
        var self = this;
        var value = e.detail.value;
        // 设置
        self.setData({
            pickerIndex: value
        })
    },
    bindPickerChange: function (e) {
        this.setData({
            companyIndex: e.detail.value
        })
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
        syncFocusStatu(self, 1);
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
            if (!CheckFun.parcel(inParcelNumber)) {
                wx.showModal({
                    title: '提示',
                    content: '快递单号格式不正确',
                    showCancel: false
                });
                self.setData({
                    parcelNumber: "",
                    parcelFocus: true
                });
                break;
            }
            // 识别快递公司
            discernCompanyAuto(self, function(){
                // 切换号码
                nextGoMobile(self, false);
                syncInputStatu(self, 2);
            });
        } while (0);
    },
    onMobileFocus: function (e) {
        var self = this;
        var inValue = self.data.phoneNumber;
        var clearShow = (inValue.length > 0);
        switchInputRow(self, 2);
        self.setData({
            mobileClearShow: clearShow,
            aipPopShow: true
        });
        syncFocusStatu(self, 2);
    },
    onMobileBlur: function (e) {
        var self = this;
        var theStatu = self.data.inputStatu;
        var isInMobile = (theStatu == 2);
        self.setData({
            mobileClearShow: false,
            aipPopShow: false
        });
        switchInputRow(self, theStatu);
    },
    clearPhoneNumber: function (e) {
        var self = this;
        switchInputRow(self, 2);
        self.setData({
            phoneNumber: "",
            mobileFocus: true,
            mobileClearShow: false
        });
        syncFocusStatu(self, 2);
    },
    scanStart: function (e) {
        var self = this;
        if (isInputParcel(self)) {
            scanParcelNumber(self);
        }
        else if (isInputMobile(self)) {
            // 跳转相机页面
            linkPageCamera(self);
        }
    },
    scanClose: function (e) {
        var self = this;
        scanImgStart(self, false);
    },
	inputParcelNumber: function(e){
        var self = this;
        var inValue = e.detail.value;
        inValue = common.trim(inValue);
        // 输入校验
        if (inValue.length > 0){
            inValue = (CheckFun.parcel(inValue)) ? inValue : self.data.parcelNumber;
        }
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
        inValue = common.trim(inValue);
        inValue = MobileFun.reset(inValue);
        var oldValue = MobileFun.reset(self.data.phoneNumber);
        // 数字语音提示
        var curValue = inValue.slice(-1);
        if (CheckFun.number(curValue) && (oldValue.length < inValue.length)){
            audioNumberTip("start", curValue);
        }
        // 输入校验
        if (inValue.length > 0) {
            inValue = (CheckFun.number(inValue)) ? inValue : oldValue;
        }
        inValue = (inValue.length > 11) ? inValue.slice(0, 11) : inValue;
        var clearShow = (inValue.length > 0);
        self.setData({
            phoneNumber: MobileFun.fat(inValue),
            mobileClearShow: clearShow
        });
        // check finish
        checkPhoneFinish(self);
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
            if (!CheckFun.phone(inPhoneNumber)) {
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
	},
    bindAipStart: function (e) {
        var self = this;
        // 录音
        checkScopeRecord(function(){
            recordFun.start(recordOpt);
            recordFun.onStart(function () {
                console.log('recorder start');
                wx.hideLoading();
                aipAnimShowFun(self, true);
            });
            recordFun.onError(function (res) {
                console.log(res, "recorder err");
            })
        });
    },
    bindAipEnd: function (e) {
        var self = this;
        recordFun.stop();
        recordFun.onStop(function (res) {
            console.log('recorder end');
            aipAnimShowFun(self, false);
            var recordFile = res.tempFilePath;
            recordServer(self, recordFile);
        });
    }
});
// check phone finish
function checkPhoneFinish(self){
    var inValue = MobileFun.reset(self.data.phoneNumber);
    if (CheckFun.phone(inValue)) {
        // 获取位置编号
        getParcelPosCode(self);
    } else {
        if (inValue.length >= 11) {
            wx.showModal({
                title: '提示',
                content: '手机号格式错误',
                showCancel: false,
                success: function (res) {
                    self.setData({
                        phoneNumber: "",
                        mobileFocus: true,
                        mobileClearShow: false
                    });
                }
            });
        }
    }
}
// aip anim
function aipAnimShowFun(self, flag){
    flag = (flag != undefined) ? flag : false;
    self.setData({
        aipAnimShow: flag
    });
}
// 扫描单号
function scanParcelNumber(self){
    wx.scanCode({
        onlyFromCamera: true,
        success: function (res) {
            var inValue = res["result"];
            if (CheckFun.parcel(inValue) && inValue.length > 0){
                self.setData({
                    parcelNumber: inValue
                });
                setTimeout(function () {
                    // 提示
                    scanTipFun("start");
                    // 识别快递公司
                    discernCompanyAuto(self, function () {
                        syncInputStatu(self, 2);
                    });
                }, 500);
            }
            else{
                wx.showModal({
                    title: '提示',
                    content: '快递单号格式错误',
                    showCancel: false
                })
            }
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
	inData.fastName = companyList[self.data.companyIndex]["id"];
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
    inData.fastName = companyList[self.data.companyIndex]["id"];
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
                        updateParcelInput(self, dataObj);
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
// 更新包裹输入
function updateParcelInput(self, data) {
    var jsonData = data;
    // 清除OCR内容
    ImgOCRFun.clear();
    // 检查是否允许继续录入
    checkIsAllowInput(self, function () {
        clearInputContent(self);
        syncInputStatu(self, 1);
    });
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

/************** 识别图像 *************/
// 扫描图片开始
function scanImgStart(self, flag) {
    recogImgOcrEnable = flag;
    clearTimeout(recogImgOcrTimer);
};
// 扫描OCR开始
function scanImgOCRStart(self, flag) {
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
                            if (recogImgOcrEnable) {
                                cameraShow(self, true);
                                recogImgOcrTimer = setTimeout(function () {
                                    startRecogImgOcr(self);
                                }, 500);
                            }
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
    else {
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
function recogMobileSuccess(self, data) {
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
/************** 识别图像 *************/

/*************** 识别语音 *******************/
//
function recordServer(self, data) {
    wx.showLoading({
        title: '正在识别...',
    });
    var uploadTask = wx.uploadFile({
        url: Server["audioCover"] + "?openId=" + UserIdFun.get(),
        method: "POST",
        filePath: data,
        name: 'audio',
        success: function (res) {
            wx.hideLoading();
            var jsonData = JSON.parse(res.data);
            var dataObj = jsonData['data'];
            var code = parseInt(jsonData['code']);
            switch (code) {
                case CODEOK:
                    var mobile = dataObj["mobile"].replace(/[^0-9]/ig, "");
                    self.setData({
                        phoneNumber: mobile
                    });
                    checkPhoneFinish(self);
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
