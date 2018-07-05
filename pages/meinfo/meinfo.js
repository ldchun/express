var config = require('../../config.js');
var common = require('../../asset/js/common.js');
var Server = config.service;
var Session = common.Session;
var AppPages = common.AppPages;
var UserIdFun = common.UserIdFun;
var wxShowToast = common.wxShowToast;
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
		infoPhoneNumber: "",
        infoAddress: "",
        infoSmsAddress: ""
    },
    onLoad: function (e) {
        var self = this;
    },
	onShow: function (e) {
		var self = this;
		// 获取信息
		getPageInfo(self);
	},
	editMeInfo: function (e) {
        var self = this;
		wx.navigateTo({
			url: AppPages.pageMeEdit
		})
    }
});
// 设置数据
function setPageInfo(self, data) {
	var jsonData = data;
	self.setData({
		infoPhoneNumber: jsonData["mobile"],
		infoAddress: jsonData["address"],
		infoSmsAddress: jsonData["smsAddress"]
	});
}
// 获取信息
function getPageInfo(self) {
	var inData = new getInData();
	// 提交
	wx.showLoading({
		title: '加载中...',
	});
	wx.request({
		url: Server["userInfo"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
					setPageInfo(self, dataObj);
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: "获取信息失败",
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
	});
}