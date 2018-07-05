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
// 校验电话号码
function checkPhoneNumber(inVal) {
    var myreg = /^[1][3,4,5,6,7,8][0-9]{9}$/;
    return myreg.test(inVal);
}

Page({
    data:{
        loadok: 'slhide',
		phoneNumber: "",
        address: "",
        smsAddress: ""
    },
    onLoad: function (options) {
        var self = this;
    },
	onShow: function (e) {
		var self = this;
		// 获取信息
		getPageInfo(self);
	},
    inPhoneNumber: function (e) {
        this.setData({
            phoneNumber: e.detail.value
        })
    },
    inAddress: function (e) {
		var self = this;
		this.setData({
            address: e.detail.value
		});
    },
    inSmsAddress: function (e) {
        var self = this;
        this.setData({
            smsAddress: e.detail.value
        });
    },
	canIUse: function () {
		if (!wx.canIUse('button.open-type.getUserInfo')) {
			wx.showModal({
				title: '请升级微信版本',
				content: '微信版本太旧，将无法完成注册',
				showCancel: false
			});
		}
	},
	saveUserInfoShop: function (e) {
        var self = this;
		var errMsg = e.detail.errMsg;
		if (errMsg == "getUserInfo:ok"){
			var userInfo = e.detail.userInfo;
			// 提交
			submitSaveUserInfo(self, userInfo);
		}
		else if (errMsg == "getUserInfo:fail auth deny"){
			wx.showModal({
				title: '提示',
				content: '快递社区助手需要获取用户昵称',
				showCancel: false
			});
		}
    }
});
// 设置数据
function setPageInfo(self, data) {
	var jsonData = data;
	self.setData({
		phoneNumber: jsonData["mobile"],
		address: jsonData["address"],
		smsAddress: jsonData["smsAddress"]
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
// 保存信息
function submitSaveUserInfo(self, userInfo) {
	var avatarUrl = userInfo.avatarUrl;
	var nickName = userInfo.nickName;
	var inData = new getInData();
	inData.userName = nickName;
	inData.address = self.data.address;
	inData.smsAddress = self.data.smsAddress;
	inData.mobile = self.data.phoneNumber;
	do {
		if (inData.mobile == "") {
			wx.showModal({
				title: '提示',
				content: '商户电话不能为空',
				showCancel: false
			})
			break;
		}
		if (!checkPhoneNumber(inData.mobile)) {
			wx.showModal({
				title: '提示',
				content: '请填写正确的商户手机号',
				showCancel: false
			})
			break;
		}
		if (inData.address == "") {
			wx.showModal({
				title: '提示',
				content: '商户地址不能为空',
				showCancel: false
			});
			break;
		}
		if (inData.smsAddress == "") {
			wx.showModal({
				title: '提示',
				content: '短信地址不能为空',
				showCancel: false
			})
			break;
		}
		// 提交
		wx.showLoading({
			title: '加载中...',
		})
		wx.request({
			url: Server["userUpdate"] + "?openId=" + UserIdFun.get(),
			method: "POST",
			data: inData,
			success: function (res) {
				wx.hideLoading();
				var jsonData = res.data;
				var code = jsonData['code'];
				switch (code) {
					// 成功
					case CODEOK:
						wxShowToast({
							title: "修改成功",
							flag: "success"
						});
						// 返回
						setTimeout(function(){
							wx.navigateBack({
								delta: 1
							})
						}, 500);
						break;
					default:
						wxShowToast({
							title: "修改失败",
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
		})
	} while (0);
}