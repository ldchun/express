var config = require('../../config.js');
var common = require('../../asset/js/common.js');
var Server = config.service;
var Session = common.Session;
var AppPages = common.AppPages;
var UserIdFun = common.UserIdFun;
var wxShowToast = common.wxShowToast;
var DateFun = new common.DateFun;
var ShopFun = new common.ShopFun;
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
        courierTel: "",
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
            url: AppPages.pageCrrecord + "?shopid=" + dataset["shopid"]
        })
    }
});
// 加载内容
function loadPageContent(self){
    // 快递员信息
    loadCourierInfo(self);
    // 加载商户列表
    loadShopList(self);
}

/**********  快递员信息 ***********/

// 格式化电话成部分保留
function fatMobileToPart(mobile){
    if (typeof (mobile) == "undefined"){return "";}
    var mobileLeft = mobile.slice(0, 3);
    var mobileRight = mobile.slice(-4);
    return mobileLeft + "****" + mobileRight;
}
// 设置
function setCourierInfo(self, jsonData) {
    var mobile = fatMobileToPart(jsonData["mobile"]);
    self.setData({
        courierTel: mobile
    });
}
// 快递员
function loadCourierInfo(self) {
    var inData = new getInData();
    wx.request({
        url: Server["courierInfo"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    // 设置信息
                    setCourierInfo(self, dataObj);
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
        dataTmp.shopId = dataObj["id"];
        dataTmp.smsAddress = dataObj["smsAddress"];
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
// 列表
function loadShopList(self) {
    var listData = ShopFun.list();
    setShopList(self, listData);
}