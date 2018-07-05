var config = require('../../config.js');
var common = require('../../asset/js/common.js');
var Server = config.service;
var Session = common.Session;
var AppPages = common.AppPages;
var UserIdFun = common.UserIdFun;
var wxShowToast = common.wxShowToast;
var DateFun = new common.DateFun;
var CompanyFun = new common.CompanyFun;
// 设置
var CODEOK = 200;
var CODEERR = 500;
var companyList = CompanyFun.list();
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}
// 弹窗显示
// 快递信息
function popWinShow(self, data) {
	var jsonData = data;
	var flag = !(jsonData == false);
	var popShowClass = flag ? "on" : "";
	var companyName = flag ? jsonData["companyName"] : "";
	var totalNumber = flag ? jsonData["totalNumber"] : "";
	// 设置信息
	self.setData({
		infoCompanyName: companyName,
		infoTotalNumber: totalNumber,
		popShow: popShowClass
	});
}

Page({
    data:{
        loadok: 'slhide',
		popShow: "",
		companyArr: companyList,
		companyIndex: 0,
		totalNum: "",
        numberFocus: true,
		indicatorDots: false,
		autoplay: false,
		circular: true
    },
    onLoad: function (options) {
        var self = this;
		popWinShow(self, false);
    },
	swipeItemChange: function(e){
		this.setData({
			companyIndex: e.detail.current,
            numberFocus: true
		});
	},
	inNumber: function (e) {
		var self = this;
		var inVal = common.trim(e.detail.value);
		inVal = inVal.replace(/\s+/g, "");
		self.setData({
			totalNum: inVal
		});
	},
	submitNewTask: function () {
		var self = this;
		var inTotalNum = self.data.totalNum;
		do {
			if (inTotalNum == "") {
				wx.showModal({
					title: '提示',
					content: '快递数量不能为空',
					showCancel: false
				})
				break;
			}
			if (parseInt(inTotalNum) <= 0) {
				wx.showModal({
					title: '提示',
					content: '快递数量不能为0',
					showCancel: false
				})
				break;
			}
			// 信息确认
			checkTaskInfo(self);
		} while (0);
	},
	popWinCancle: function (e) {
		var self = this;
		popWinShow(self, false);
	},
	popWinOk: function (e) {
		var self = this;
		// 提交
		submitTaskServer(self);
	}
});
//信息确认
function checkTaskInfo(self){
	var companyIndex = self.data.companyIndex;
	var infoData = {
		companyName: companyList[companyIndex]["name"],
		totalNumber: self.data.totalNum
	};
	popWinShow(self, infoData);
}

// 提交任务到server
function submitTaskServer(self){
	wx.showLoading({
		title: '加载中...',
	});
	var companyIndex = self.data.companyIndex;
	var theCompanyId = companyList[companyIndex]["label"];
	var inData = new getInData();
	inData.fastName = theCompanyId;
	inData.parcelCount = self.data.totalNum;
	wx.request({
		url: Server["createBatch"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
					wxShowToast({
						title: "创建成功",
						flag: "success"
					});
					popWinShow(self, false);
					startParcelInput(self, dataObj);
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: msg,
						flag: "fail"
					});
					popWinShow(self, false);
			}
		},
		fail: function (err) {
			wx.hideLoading();
			console.log(err);
			wxShowToast({
				title: "提交失败",
				flag: "fail"
			});
		}
	})
}
//跳转添加包裹
function startParcelInput(self, data){
	var jsonData = data;
	wx.redirectTo({
		url: AppPages.pageInput + "?batchid=" + jsonData["batchId"]
	});
}