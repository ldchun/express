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
// 倒计时
function CountDownFun() {
    var countMax = 60;
    var countMin = 0;
    this.timer = "";
    this.start = function (self) {
        clearInterval(this.timer);
        this.countshow(self, true);
        self.setData({
            allowGetCode: false,
            countDownValue: countMax
        });
        this.timer = setInterval(function () {
            var count = self.data.countDownValue;
            count = count - 1;
            console.log(count);
            if (count < countMin) {
                this.init(self);
            } else {
                self.setData({
                    countDownValue: count
                });
            }
        }.bind(this), 1000);
    };
    this.init = function (self) {
        clearInterval(this.timer);
        this.countshow(self, false);
        self.setData({
            countDownValue: countMin
        });
    };
    this.countshow = function (self, flag) {
        self.setData({
            allowGetCode: !flag
        });
    };
}
var countDownFun = new CountDownFun();

Page({
    data:{
        loadok: 'slhide',
		optList: roleOptions,
		optIndex: -1,
		phoneNumber: "",
        address: "",
        smsAddress: "",
        allowGetCode: true,
        courierMobile:"",
        countDownValue: "",
        courierAuthKey: "",
        courierAuthCode: ""
    },
    onLoad: function (options) {
        var self = this;
        countDownFun.init(self);
    },
	optClick: function (e) {
		var self = this;
		this.setData({
			optIndex: e.currentTarget.id
		});
	},
    inPhoneNumber: function (e) {
        var self = this;
        var inValue = e.detail.value;
        // 输入校验
        if (inValue.length > 0) {
            inValue = (CheckFun.number(inValue)) ? inValue : self.data.phoneNumber;
        }
        inValue = (inValue.length > 11) ? inValue.slice(0, 11) : inValue;
        this.setData({
            phoneNumber: inValue
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
    },
    inCourierMobile: function (e) {
        var self = this;
        var inValue = e.detail.value;
        // 输入校验
        if (inValue.length > 0) {
            inValue = (CheckFun.number(inValue)) ? inValue : self.data.courierMobile;
        }
        inValue = (inValue.length > 11) ? inValue.slice(0, 11) : inValue;
        this.setData({
            courierMobile: inValue
        })
    },
    inAuthCode: function (e) {
        var self = this;
        var inValue = e.detail.value;
        // 输入校验
        if (inValue.length > 0) {
            inValue = (CheckFun.number(inValue)) ? inValue : self.data.courierAuthCode;
        }
        this.setData({
            courierAuthCode: e.detail.value
        });
    },
    getAuthCode: function (e){
        var self = this;
        getAuthCodeCourier(self);
    },
    getUserInfoForCourier: function (e) {
        var self = this;
        var errMsg = e.detail.errMsg;
        if (errMsg == "getUserInfo:ok") {
            var userInfo = e.detail.userInfo;
            // 提交
            submitCourierReg(self, userInfo);
        }
        else if (errMsg == "getUserInfo:fail auth deny") {
            wx.showModal({
                title: '提示',
                content: '快递智能助手需要获取用户昵称、头像信息',
                showCancel: false
            });
        }
    }
});

/************* 商户 **************/

// 商户注册
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

/************* 快递员 **************/

// 获取快递员短信验证码
function getAuthCodeCourier(self) {
    var inData = new getInData();
    inData.mobile = self.data.courierMobile;
    do {
        if (inData.mobile == "") {
            wx.showModal({
                title: '提示',
                content: '手机号不能为空',
                showCancel: false
            })
            break;
        }
        if (!CheckFun.phone(inData.mobile)) {
            wx.showModal({
                title: '提示',
                content: '手机号格式错误',
                showCancel: false
            })
            break;
        }
        // 提交
        wx.request({
            url: Server["courierGetAuthCode"],
            data: inData,
            success: function (res) {
                wx.hideLoading();
                var jsonData = res.data;
                var dataObj = jsonData['data'];
                var code = jsonData['code'];
                switch (code) {
                    // 成功
                    case CODEOK:
                        wxShowToast({
                            title: "获取成功",
                            flag: "success"
                        });
                        self.setData({
                            courierAuthKey: dataObj["authKey"]
                        });
                        // 开始倒计时
                        countDownFun.start(self);
                        break;
                    default:
                        wxShowToast({
                            title: "获取失败",
                            flag: "fail"
                        });
                }
            },
            fail: function (err) {
                wx.hideLoading();
                console.log(err);
                wxShowToast({
                    title: "获取失败",
                    flag: "fail"
                });
            }
        })
    } while (0);
}
// 快递员注册
function submitCourierReg(self, userInfo) {
    var avatarUrl = userInfo.avatarUrl;
    var nickName = userInfo.nickName;
    var inData = new getInData();
    inData.nickName = nickName;
    inData.mobile = self.data.courierMobile;
    inData.authKey = self.data.courierAuthKey;
    inData.authCode = self.data.courierAuthCode;
    inData.role = roleOptions[self.data.optIndex]["role"];
    do {
        if (inData.mobile == "") {
            wx.showModal({
                title: '提示',
                content: '手机号不能为空',
                showCancel: false
            })
            break;
        }
        if (!CheckFun.phone(inData.mobile)) {
            wx.showModal({
                title: '提示',
                content: '手机号格式错误',
                showCancel: false
            })
            break;
        }
        if (inData.authCode == "") {
            wx.showModal({
                title: '提示',
                content: '短信验证码不能为空',
                showCancel: false
            });
            break;
        }
        // 提交
        wx.showLoading({
            title: '加载中...',
        })
        wx.request({
            url: Server["courierReg"],
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
                        var msg = jsonData['msg'];
                        wx.showModal({
                            title: '提示',
                            content: msg,
                            showCancel: false,
                            success: function (res) {}
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