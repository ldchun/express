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
// 设置
var CODEOK = 200;
var CODEERR = 500;
var pageSize = 5;
var pageCurrent = 1;
//系统信息
var sysInfo = wx.getSystemInfoSync();
var pixelRatio = sysInfo.pixelRatio;
var screenWidth = sysInfo.windowWidth;
var screenHeight = sysInfo.windowHeight;
// 校验快递单号
function checkParcelNumber(inVal) {
    var myreg = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
    return myreg.test(inVal);
}
// 校验电话号码
function checkPhoneNumber(inVal) {
    var myreg = /^[1][3,4,5,6,7,8][0-9]{9}$/;
    return myreg.test(inVal);
}
// 提示音
var innerAudioContext;
var serverAudioSrc = {
    "success": "https://renxingstyle.xyz/media/success.mp3"
};
var localAudioSrc = {
    "success": ""
};
// 下载音频文件，生成本地路径
function downLoadAudioFile() {
    // 正确
    wx.downloadFile({
        url: serverAudioSrc["success"],
        success: function (res) {
            if (res.statusCode === 200) {
                localAudioSrc["success"] = res.tempFilePath;
            }
        }
    })
}
// 扫描提示
function scanTipFun(handle) {
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
// 包裹状态
function fatParcelStatus(status) {
    var statusTxt = "";
    status = parseInt(status);
    switch (status) {
        case 0:
            statusTxt = "未领取";
            break;
        case 1:
        case 3:
            statusTxt = "已领取";
            break;
    }
    return statusTxt;
}
// 是否已领取
function checkParcelIsTake(status) {
    status = parseInt(status);
    return ((status == 1) || (status == 3)) ? true : false;
}
// 是否异常领取
function isParcelTakeUn(status) {
    status = parseInt(status);
    return (status == 3) ? true : false;
}

Page({
	data: {
		loadok: 'slhide',
        submitHide: true,
        clearHide: true,
        inputFocus: true,
        inSearchText: "",
        resultList: [],
        countTotal: 0,
		isLoading: false,
		isLoadComplete: false,
        noResult: true,
        popInShow: false,
        popMobileFocus: false,
        popMobileClearShow: false,
        popMobileNumber: "",
        popParcelId: ""
	},
	onLoad: function (options) {
		var self = this;
        // 清空内容
        clearContent(self);
        // 下载音频文件
        downLoadAudioFile();
        // 创建音频上下文
        innerAudioContext = wx.createInnerAudioContext();
	},
    inputSearchText: function (e) {
        var self = this;
        var inValue = e.detail.value;
        inValue = common.trim(inValue);
        // 输入校验
        if (inValue.length > 0) {
            inValue = (checkParcelNumber(inValue)) ? inValue : self.data.inSearchText;
        }
        var clearHide = !(inValue.length > 0);
        self.setData({
            inSearchText: inValue,
            clearHide: clearHide,
            submitHide: clearHide
        });
    },
    searchClear: function (e) {
        var self = this;
        self.setData({
            inSearchText: "",
            clearHide: true,
            submitHide: true,
            inputFocus: true
        });
    },
    searchScan: function (e) {
        var self = this;
        // 扫描
        scanInputContent(self);
    },
    searchCancle: function(e){
        // 返回
        wx.navigateBack({
            delta: 1
        });
    },
    searchSubmit: function (e) {
        var self = this;
        // 校验
        var searchText = self.data.inSearchText;
        if (!checkParcelNumber(searchText)) {
            wx.showModal({
                title: '提示',
                content: '搜索内容格式错误',
                showCancel: false
            });
            self.setData({
                submitHide: true,
                clearHide: true,
                inputFocus: true,
                inSearchText: ""
            });
        }else{
            // 搜索
            searchListLoad(self);
        }
    },
	onReachBottom: function (e) {
		var self = this;
		// 加载更多
		loadListData(self, false);
	},
    handleMore: function(e){
        var self = this;
        var dataset = e.currentTarget.dataset;
        handleMoreFun(self, dataset);
    },
    takeNotParcel: function (e) {
        var self = this;
        var dataset = e.currentTarget.dataset;
        wx.showModal({
            title: '警告',
            content: '无取件码也要领取？一定要慎重哦！！',
            cancelText: "确定",
            cancelColor: "#FF0000",
            confirmText: "取消",
            success: function (res) {
                if (res.confirm) {
                } else if (res.cancel) {
                    // 取件
                    submitTakeParcel(self, dataset);
                }
            }
        })
    },
    inputMobileNumber: function(e){
        var self = this;
        var inValue = e.detail.value;
        inValue = MobileFun.reset(inValue);
        inValue = (inValue.length > 11) ? inValue.slice(0, 11) : inValue;
        var clearShow = (inValue.length > 0);
        self.setData({
            popMobileNumber: MobileFun.fat(inValue),
            popMobileClearShow: clearShow
        });
    },
    clearMobileNumber: function (e) {
        var self = this;
        self.setData({
            popMobileNumber: "",
            popMobileFocus: true,
            popMobileClearShow: false
        });
    },
    popWinCancle: function (e) {
        var self = this;
        popWinShow(self, false);
    },
    popWinOk: function (e) {
        var self = this;
        // 修改收件人号码
        updateParcelMoble(self);
    }
});
// 修改收件人号码
function updateParcelMoble(self){
    var inData = new getInData();
    inData.parcelId = self.data.popParcelId;
    var inMobileNumber = self.data.popMobileNumber;
    inData.mobile = MobileFun.reset(inMobileNumber);
    do{
        if (inData.parcelId == "") {
            popWinShow(self, false);
            break;
        }
        if (!checkPhoneNumber(inData.mobile)) {
            wx.showModal({
                title: '提示',
                content: '请填写正确的手机号',
                showCancel: false
            })
            break;
        }
        // 提交
        wx.showLoading({
            title: '加载中...',
        })
        wx.request({
            url: Server["updateParcelMobile"],
            data: inData,
            success: function (res) {
                wx.hideLoading();
                var jsonData = res.data;
                var dataObj = jsonData['data'];
                var code = jsonData['code'];
                switch (code) {
                    case CODEOK:
                        // 修改成功
                        wxShowToast({
                            title: "修改手机号成功",
                            flag: "success"
                        });
                        var dataInfo = { parcelid: inData.parcelId};
                        retrySendMsm(self, dataInfo, function(){
                            popWinShow(self, false);
                            // 重新加载内容
                            startLoadTabContent(self);
                        });
                        break;
                    default:
                        var msg = jsonData['msg'];
                        wxShowToast({
                            title: "修改手机号失败",
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
    }while(0);
}
// 弹窗显示
function popWinShow(self, flag) {
    if(flag){
        self.setData({
            popInShow: true,
            popMobileFocus: true,
            popMobileClearShow: false,
            popMobileNumber: ""
        });
    }else{
        self.setData({
            popInShow: false,
            popMobileFocus: false,
            popMobileClearShow: false,
            popMobileNumber: "",
            popParcelId: ""
        });
    }
}
// 直接领取快件
function submitTakeParcel(self, data) {
    var jsonData = data;
    wx.showLoading({
        title: '加载中...',
    })
    var inData = new getInData();
    inData.takeCode = jsonData["takecode"];
    inData.status = 1; // 异常取件
    wx.request({
        url: Server["takeParcel"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    // 取件成功
                    wxShowToast({
                        title: "取件成功",
                        flag: "success"
                    });
                    // 重新加载内容
                    searchListLoad(self);
                    break;
                default:
                    var msg = jsonData['msg'];
                    wxShowToast({
                        title: "取件失败",
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
// 搜索结果加载
function searchListLoad(self){
    // 清空内容
    clearContent(self);
    // 搜索
    loadListData(self, true);
}
// 同步输入操作
function syncInputBtnHide(self){
    var inValue = self.data.inSearchText;
    var clearHide = (inValue.length > 0) ? false : true;
    self.setData({
        clearHide: clearHide,
        submitHide: clearHide
    });
}
// 清除内容
function clearContent(self){
    self.setData({
        resultList: [],
        countTotal: 0,
        isLoading: false,
        isLoadComplete: false,
        noResult: true
    });
    pageCurrent = 1;
};
// 扫描输入内容
function scanInputContent(self) {
    wx.scanCode({
        onlyFromCamera: true,
        success: function (res) {
            var inValue = res["result"];
            if (checkParcelNumber(inValue) && inValue.length > 0) {
                self.setData({
                    inSearchText: inValue
                });
                setTimeout(function () {
                    // 提示
                    scanTipFun("start");
                }, 500);
                // 同步
                syncInputBtnHide(self);
                // 搜索
                searchListLoad(self);
            }
            else {
                wx.showModal({
                    title: '提示',
                    content: '输入内容格式错误',
                    showCancel: false
                })
            }
        },
        fail: function (err) {
            console.log(err);
        }
    });
}
// 更多操作
function handleMoreFun(self, data) {
    var jsonData = data;
    var parcelid = jsonData["parcelid"];
    var mobile = jsonData["mobile"];
    var isTake = jsonData["istake"];
    // 未取包裹 增加重发信息
    if (!isTake) {
        wx.showActionSheet({
            itemList: ["致电收件人", "重发信息", "修改收件人号码并重发信息"],
            success: function (res) {
                var tapIndex = res.tapIndex;
                switch (tapIndex) {
                    case 0: // 致电收件人
                        wx.makePhoneCall({
                            phoneNumber: mobile
                        })
                        break;
                    case 1: // 重发信息
                        checkIsAllowSend(self, function(){
                            retrySendMsm(self, jsonData);
                        });
                        break;
                    case 2: // 修改收件人号码
                        popWinShow(self, true);
                        self.setData({
                            popParcelId: parcelid
                        });
                        break;
                }
            },
            fail: function (res) {
                console.log(res.errMsg)
            }
        });
    }
    else {
        wx.showActionSheet({
            itemList: ["致电收件人", "复制收件人号码"],
            success: function (res) {
                var tapIndex = res.tapIndex;
                switch (tapIndex) {
                    case 0: // 致电收件人
                        wx.makePhoneCall({
                            phoneNumber: mobile
                        })
                        break;
                    case 1: // 复制收件人号码
                        wx.setClipboardData({
                            data: mobile,
                            success: function (res) {
                                wx.showToast({
                                    title: "复制成功",
                                    icon: 'none',
                                    duration: 1000
                                });
                            }
                        })
                        break;
                }
            },
            fail: function (res) {
                console.log(res.errMsg)
            }
        });
    }
}
// 重发信息
function retrySendMsm(self, data, callback) {
    var jsonData = data;
    var inData = new getInData();
    inData.parcelId = jsonData["parcelid"];
    wx.showLoading({
        title: '加载中...',
    });
    wx.request({
        url: Server["resendSmsParcel"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    wxShowToast({
                        title: "发送信息成功",
                        flag: "success"
                    });
                    // 回调
                    if (typeof (callback) != 'undefined') {
                        callback();
                    }
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
                            if (isNeedRecharge) {
                                wx.navigateTo({
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
                title: "发送失败",
                flag: "fail"
            });
        }
    })
}
// 判断是否允许
function checkIsAllowSend(self, callback) {
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
                                wx.navigateTo({
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
// 处理列表数据
function handleListData(dataArr) {
    var listArr = [].concat(dataArr);
    var arrLen = listArr.length;
    for (var i = 0; i < arrLen; i++) {
        var dataObj = listArr[i];
        var dataTmp = {};
		dataTmp.sordId = (pageCurrent - 1) * pageSize + i + 1;
        var companyInfo = CompanyFun.get(dataObj["fastName"]);
        dataTmp.companyName = companyInfo["name"];
        dataTmp.companyLogo = companyInfo["logo"];
        dataTmp.phoneNumber = dataObj["mobile"];
        dataTmp.parcelNumber = dataObj["parcelNumber"];
        dataTmp.posNumber = dataObj["positionCode"];
        dataTmp.parcelStatus = fatParcelStatus(dataObj["status"]);
        dataTmp.isTake = checkParcelIsTake(dataObj["status"]);
        dataTmp.isTakeUn = isParcelTakeUn(dataObj["status"]);
        dataTmp.parcelId = dataObj["id"];
        dataTmp.takeCode = dataObj["takeCode"];
        // 收件时间
        var createTimeObj = DateFun.fat(dataObj["createTime"], { mode: "yyyymmdd hhmmss", join: "-" });
        dataTmp.createTime = createTimeObj.val;
        // 取件时间
        dataTmp.takeTime = false;
        if (typeof (dataObj["takeTime"]) != "undefined"){
            var takeTimeObj = DateFun.fat(dataObj["takeTime"], { mode: "yyyymmdd hhmmss", join: "-" });
            dataTmp.takeTime = takeTimeObj.val;
        }
        listArr[i] = dataTmp;
    }
    return listArr;
}
// 请求列表
function loadListData(self, isFirstLoad) {
    var isLoadComplete = self.data.isLoadComplete;
    if (isLoadComplete) {
        return;
    }
    // 校验
    var searchText = self.data.inSearchText;
    if (searchText == "") {
        wx.showModal({
            title: '提示',
            content: '搜索内容不能为空',
            showCancel: false
        })
        return;
    }
    // 参数
    var inData = new getInData();
    inData.numbers = self.data.inSearchText;
    // 当前页码
    pageCurrent = isFirstLoad ? 1 : pageCurrent + 1;
    inData.currentPage = pageCurrent;
    inData.pageSize = pageSize;
    // 提交
    self.setData({
        isLoading: true,
        isLoadComplete: false
    });
    wx.request({
        url: Server["searchParcel"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    var listArr = dataObj["dataList"];
                    var listLen = listArr.length;
                    var countTotal = dataObj["allCount"];
                    var countHave = (pageCurrent - 1) * pageSize + listLen;
                    listArr = handleListData(listArr);
                    var oldListArr = self.data.resultList;
                    if (!isFirstLoad) {
                        listArr = oldListArr.concat(listArr);
                    }
                    // 无结果提示
                    var noResultHide = (countTotal > 0);
                    self.setData({
                        noResult: noResultHide
                    });
                    // 设置数据
                    if (countHave >= countTotal) {
                        self.setData({
                            resultList: listArr,
                            isLoading: false,
                            isLoadComplete: true
                        });
                    } else {
                        self.setData({
                            resultList: listArr,
                            isLoading: false,
                            isLoadComplete: false
                        });
                    }
                    // 判断是否自动加载更多
                    var query = wx.createSelectorQuery();
                    query.select('#contentElem').boundingClientRect(function (rect) {
                        var contentHeight = rect.height;
                        if (contentHeight <= screenHeight) {
                            // 加载数据
                            loadListData(self, false);
                        }
                    }).exec();
                    break;
                default:
                    var msg = jsonData['msg'];
                    wxShowToast({
                        title: msg,
                        flag: "fail"
                    });
                    self.setData({
                        isLoading: false,
                        isLoadComplete: false
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
            self.setData({
                isLoading: false,
                isLoadComplete: false
            });
        }
    })
}