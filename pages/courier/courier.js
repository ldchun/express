var config = require('../../config.js');
var common = require('../../asset/js/common.js');
var Server = config.service;
var Session = common.Session;
var AppPages = common.AppPages;
var UserIdFun = common.UserIdFun;
var wxShowToast = common.wxShowToast;
var DateFun = new common.DateFun;
// 设置
var CODEOK = 200;
var CODEERR = 500;
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}

Page({
    data:{
        loadok: 'slhide',
        userTel: "",
        sumTodayAll: 0,
        sumTodayHas: 0,
        sumTodayNot: 0,
        sumMonthAll: 0,
        resultHas: false,
        resultList: []
    },
    onLoad: function (e) {
        var self = this;
    },
	onShow: function (e) {
		var self = this;
		// 加载内容
		loadPageContent(self);
	},
    onPullDownRefresh: function () {
        var self = this;
        loadPageContent(self);
        wx.stopPullDownRefresh();
    },
    linkShopDetail: function(e){
        var self = this;
        var dataset = e.currentTarget.dataset;
        wx.navigateTo({
            url: AppPages.pageCrrecord + "?shopid=" + dataset["shopid"] + "&starttime=" + dataset["starttime"] + "&endtime=" + dataset["endtime"]
        })
    }
});
// 加载内容
function loadPageContent(self){
    // 加载信息
    loadCourierInfo(self);
}

/**********  统计 ***********/

// 设置
function setSumInfo(self, jsonData) {
    self.setData({
        sumTodayAll: jsonData["todayAllCount"],
        sumTodayHas: jsonData["todayTakeCount"],
        sumTodayNot: jsonData["todayNotTakeCount"],
        sumMonthAll: jsonData["toMonthAllCount"]
    });
}
// 统计
function loadCourierInfo(self) {
    var inData = new getInData();
    wx.request({
        url: Server["courierState"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    // 统计
                    setSumInfo(self, dataObj);
                    // 商家
                    var shopData = dataObj["fastDatas"];
                    setShopList(self, shopData);
                    break;
                default:
                    var msg = jsonData['msg'];
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
        }
    })
}

/**********  商户 ***********/

// 处理列表数据
function fatListData(dataArr) {
    var resArr = [];
    var listArr = [].concat(dataArr);
    var arrLen = listArr.length;
    for (var i = 0; i < arrLen; i++) {
        var dataObj = listArr[i];
        var dataTmp = {};
        var shopInfo = dataObj["user"];
        dataTmp.shopId = shopInfo["id"];
        dataTmp.smsAddress = shopInfo["smsAddress"];
        // 统计
        dataTmp.allCount = dataObj["todayAllCount"];
        dataTmp.notCount = dataObj["todayNotTakeCount"];
        // 时间
        var days = 7;
        var nowTimeVal = DateFun.fat(new Date())["val"];
        var nowTimeMs = new Date(nowTimeVal).getTime();
        var minTimeMs = nowTimeMs - 24 * 60 * 60 * 1000 * (days - 1);
        var minTimeVal = DateFun.fat(minTimeMs)["val"];
        dataTmp.startTime = minTimeVal;
        dataTmp.endTime = nowTimeVal;
        // add
        resArr.push(dataTmp);
    }
    return resArr;
}
// 设置处理
function setShopList(self, data) {
    var dataArr = fatListData(data);
    var isHasRes = (dataArr.length > 0);
    self.setData({
        resultHas: isHasRes,
        resultList: dataArr
    });
}

// 列表加载
function loadShopList(self) {
    var inData = new getInData();
    // 提交
    wx.request({
        url: Server["fastParcelInfo"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    setShopList(self, dataObj);
                    break;
                default:
                    var msg = jsonData['msg'];
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
        }
    })
}