var config = require('../../config.js');
var common = require('../../asset/js/common.js');
var Server = config.service;
var Session = common.Session;
var AppPages = common.AppPages;
var UserIdFun = common.UserIdFun;
var wxShowToast = common.wxShowToast;
var CheckFun = common.CheckFun;
// 设置
var CODEOK = 200;
var CODEERR = 500;
var logoImgPath = "../../asset/image/";
var roleOptions = [
	{ role: "shop", name: "商户", logo: logoImgPath + "icon-shopper.png" },
	{ role: "courier", name: "快递员", logo: logoImgPath + "icon-courier.png" }
];
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}

Page({
    data:{
        loadok: 'slhide',
		optList: roleOptions,
		optIndex: -1,
		phoneNumber: "",
        address: "",
        smsAddress: ""
    },
    onLoad: function (options) {
        var self = this;
    },
	optClick: function (e) {
		var self = this;
		this.setData({
			optIndex: e.currentTarget.id
		});
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
	canILogin: function(){
		if (!wx.canIUse('button.open-type.getUserInfo')) {
			wx.showModal({
				title: '请升级微信版本',
				content: '微信版本太旧，将无法完成注册',
				showCancel: false
			});
		}
	},
	getUserInfoForShop: function (e) {
        var self = this;
		var errMsg = e.detail.errMsg;
		if (errMsg == "getUserInfo:ok"){
			var userInfo = e.detail.userInfo;
			// 提交
			submitShopReg(self, userInfo);
		}
		else if (errMsg == "getUserInfo:fail auth deny"){
			wx.showModal({
				title: '提示',
                content: '快递智能助手需要获取用户昵称、头像信息',
				showCancel: false
			});
		}
    }
});
// 商户注册注册
function submitShopReg(self, userInfo) {
	var avatarUrl = userInfo.avatarUrl;
	var nickName = userInfo.nickName;
	var inData = new getInData();
	inData.userName = nickName;
	inData.address = self.data.address;
	inData.smsAddress = self.data.smsAddress;
	inData.mobile = self.data.phoneNumber;
	inData.role = roleOptions[self.data.optIndex]["role"];
	do {
		if (inData.mobile == "") {
			wx.showModal({
				title: '提示',
				content: '商户电话不能为空',
				showCancel: false
			})
			break;
		}
        if (!CheckFun.phone(inData.mobile)) {
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
			url: Server["userReg"],
			method: "POST",
			data: inData,
			success: function (res) {
				wx.hideLoading();
				var jsonData = res.data;
				var code = jsonData['code'];
				switch (code) {
					// 成功
					case CODEOK:
						wx.showModal({
							title: '提示',
                            content: '注册成功，欢迎来到快递智能助手！',
							showCancel: false,
							success: function (res) {
								// 跳转首页
								wx.reLaunch({
									url: AppPages.pageIndex
								})
							}
						});
						break;
					default:
						wxShowToast({
							title: "注册失败",
							flag: "fail"
						});
				}
			},
			fail: function (err) {
				wx.hideLoading();
				console.log(err);
				wxShowToast({
					title: "注册失败",
					flag: "fail"
				});
			}
		})
	} while (0);
}