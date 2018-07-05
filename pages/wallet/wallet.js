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
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}
// 随机数字符串
function randomString(len, charset) {
	var length = len || 32;
    var chars = charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var resStr = "";
	var maxPos = chars.length;
	for (var i = 0; i < length; i++) {
		resStr += chars.charAt(Math.floor(Math.random() * maxPos));
	}
	return resStr;
}
// 获取选项结果信息
function getOptResInfo(self, index){
	var optIndex = index;
	var rechargeList = self.data.rechargeOpts;
	var price = rechargeList[optIndex]["price"];
	var count = rechargeList[optIndex]["count"];
	var infoTxt = "共选择了" + price + "分/次，共" + count + "次套餐";
	var infoVal = parseFloat(price) * parseFloat(count) / 100;
	infoVal = parseFloat(infoVal, 2);
	return {
		txt: infoTxt,
		val: infoVal
	};
}
// 同步选项操作结果
function syncRechargeRes(self, index){
	var curIndex = (typeof (index) != "unudefind") ? index : self.data.optIndex;
	var infoObj = getOptResInfo(self, curIndex);
    var rechargeList = self.data.rechargeOpts;
    var theRechargeId = rechargeList[curIndex]["id"];
	self.setData({
    rechargeId: theRechargeId,
		optResTxt: infoObj["txt"],
		moneyTotal: infoObj["val"]
	});
}
// 设置充值套餐
function setRechargeList(self, data) {
	var jsonData = data;
	self.setData({
		rechargeOpts: jsonData
	});
	// 同步选项
	var optIndex = parseInt(self.data.optIndex);
	optIndex = (typeof (optIndex) == "number") ? optIndex : 0;
	syncRechargeRes(self, optIndex);
}
// 加载充值套餐列表
function loadRechargeList(self) {
	var inData = new getInData();
	// 提交
	wx.showLoading({
		title: '加载中...',
	});
	wx.request({
		url: Server["payRechargeList"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
					setRechargeList(self, dataObj);
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
	});
}

Page({
	data: {
		loadok: 'slhide',
		smsRemain: 0,
		rechargeOpts: [],
        rechargeId: '',
		optIndex: 0,
		optResTxt: "",
		moneyTotal: 0
	},
	onLoad: function (options) {
		var self = this;
        // 获取信息
        getPageInfo(self);
		// 充值套餐列表
		loadRechargeList(self);
	},
	optClick: function (e) {
		var self = this;
		var curIndex = e.currentTarget.id;
		this.setData({
			optIndex: curIndex
		});
		syncRechargeRes(self, curIndex);
	},
	submitOrder: function (e) {
		var self = this;
		var moneyTotal = self.data.moneyTotal;
		do {
			if (parseFloat(moneyTotal) == 0) {
				wx.showModal({
					title: '提示',
					content: '支付金额不能为0',
					showCancel: false
				})
				break;
			}
			// 购买
			buyOrderServer(self);
		} while (0);
	}
})
// 设置数据
function setPageInfo(self, data) {
	var jsonData = data;
	self.setData({
		smsRemain: jsonData["smsCount"]
	});
}
// 获取信息
function getPageInfo(self) {
    var inData = new getInData();
    // 提交
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
					setPageInfo(self, dataObj);
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
    });
}
// 购买
function buyOrderServer(self) {
	var inData = new getInData();
  // 支付金额以分为单位
  inData.money = parseInt(self.data.moneyTotal * 100);
  inData.rechargeId = self.data.rechargeId;
	// 提交
	wx.showLoading({
		title: '加载中...',
	})
	wx.request({
		url: Server["payOrderMoney"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
                    // 支付
					wxPaymentMoney(self, dataObj);
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
                        title: "提交失败",
						flag: "fail"
					});
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
	});
}
// 微信支付
function wxPaymentMoney(self, data){
	var jsonData = data;
	var nonceStr = jsonData["nonceStr"];
	var packageStr = jsonData["package"];
	var signType = "MD5";
	var timeStamp = jsonData["timeStamp"];
	var paySign = jsonData["paySign"];
    var payTradeNo = jsonData["tradeNo"];
    // 发起支付
    wx.requestPayment({
        'nonceStr': nonceStr,
        "package": packageStr,
        'signType': "MD5",
        'timeStamp': timeStamp,
        "paySign": paySign,
		'complete': function (res) {
            paySignTrade(self, payTradeNo);
		}
	});
}
// 支付标识
function paySignTrade(self, tradeNo) {
    var inData = new getInData();
    // 支付订单
    inData.tradeNo = tradeNo;
    // 提交
    wx.showLoading({
        title: '加载中...',
    })
    wx.request({
        url: Server["paySignTrade"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    // 支付
                    wxShowToast({
                        title: "支付成功",
                        flag: "success"
                    });
                    getPageInfo(self);
                    break;
                default:
                    var msg = jsonData['msg'];
                    wxShowToast({
                        title: "支付失败",
                        flag: "fail"
                    });
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
            wxShowToast({
                title: "支付失败",
                flag: "fail"
            });
        }
    });
}