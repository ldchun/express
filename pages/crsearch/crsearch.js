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
var ShopFun = new common.ShopFun;
var HintFun = common.HintFun;
// 设置
var CODEOK = 200;
var CODEERR = 500;
var pageSize = 5;
var pageCurrent = 1;
// 扫描提示操作
var scanTipFun;
//系统信息
var sysInfo = wx.getSystemInfoSync();
var pixelRatio = sysInfo.pixelRatio;
var screenWidth = sysInfo.windowWidth;
var screenHeight = sysInfo.windowHeight;
// 提示音
var innerAudioContext;
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
        noResult: true
	},
	onLoad: function (options) {
		var self = this;
        // 创建音频上下文
        innerAudioContext = wx.createInnerAudioContext();
        scanTipFun = function (handle){
            HintFun.hint(handle, innerAudioContext);
        };
        // 清空内容
        clearContent(self);
	},
    inputSearchText: function (e) {
        var self = this;
        var inValue = e.detail.value;
        inValue = common.trim(inValue);
        // 输入校验
        if (inValue.length > 0) {
            inValue = (CheckFun.parcel(inValue)) ? inValue : self.data.inSearchText;
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
        if (!CheckFun.parcel(searchText)) {
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
	}
});
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
            if (CheckFun.parcel(inValue) && inValue.length > 0) {
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
// 处理列表数据
function handleListData(dataArr) {
    var listArr = [].concat(dataArr);
    var arrLen = listArr.length;
    for (var i = 0; i < arrLen; i++) {
        var dataObj = listArr[i];
        var dataTmp = {};
		dataTmp.sortId = (pageCurrent - 1) * pageSize + i + 1;
        var shopId = dataObj["userId"].toString();
        var shopInfo = ShopFun.get(shopId, "id");
        dataTmp.shopName = shopInfo["smsAddress"];
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
        url: Server["courierSearch"],
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