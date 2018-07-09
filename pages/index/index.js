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
//系统信息
var sysInfo = wx.getSystemInfoSync();
var pixelRatio = sysInfo.pixelRatio;
var screenWidth = sysInfo.windowWidth;
var screenHeight = sysInfo.windowHeight;
// 快递列表
var logoImgPath = "./asset/image/";
var expressLogo = {
    "none": "./asset/img/logo.png",
    "yuantong": logoImgPath + "logo_yuantong.png",
    "zhongtong": logoImgPath + "logo_zhongtong.png",
    "yunda": logoImgPath + "logo_yunda.png",
    "baishi": logoImgPath + "logo_baishi.png",
    "shentong": logoImgPath + "logo_shentong.png",
    "shunfeng": logoImgPath + "logo_shunfeng.png",
    "youzheng": logoImgPath + "logo_youzheng.png",
    "tiantian": logoImgPath + "logo_tiantian.png",
    "jindong": logoImgPath + "logo_jindong.png",
    "ems": logoImgPath + "logo_ems.png",
    "debang": logoImgPath + "logo_debang.png"
};
// 增加快递全部信息
function addExpressAllObj(listData) {
    var len = listData.length;
    var resList = (len > 0) ? {} : "";
    for (var i = 0; i<len; i++){
        var listObj = listData[i];
        // key
        var para = listObj["id"];
        // logo
        if (typeof (listObj["logo"]) == "undefined") {
            listObj.logo = (typeof (expressLogo[para]) != "undefined") ? expressLogo[para] : expressLogo["none"];
        }
        // add
        resList[para] = listObj;
    }
    return resList;
}
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}
// 应用初始化 \ 获取仅限
function AppInit(self, callback) {
	// 回调
	if (typeof (callback) != 'undefined') {
		callback();
	}
}
// APP登录
function AppLogin(self, callback) {
	// 微信登录获取userId,保存在session
    function appWxLogin() {
		wx.login({
			success: function (res) {
				wx.hideLoading();
				if (res.code) {
					wx.request({
                        url: Server["wxloginUrl"],
						data: { code: res.code },
						success: function (res) {
							var jsonData = res.data['data'];
							var userId = jsonData["openId"];
							// 设置userId
							UserIdFun.set(userId);
                            // 回调
                            if (typeof (callback) != 'undefined') {
                                callback();
                            }
						},
						fail: function (err) {
							console.log(err);
                            wx.showModal({
                                title: '提示',
                                content: '登录失败，点击重新登录',
                                showCancel: false,
                                success: function (res) {
                                    AppLogin(self, callback);
                                }
                            });
						}
					})
				} else {
                    console.log('wxlogin error' + res.errMsg);
                    wx.showModal({
                        title: '提示',
                        content: '登录失败，点击重新登录',
                        showCancel: false,
                        success: function (res) {
                            AppLogin(self, callback);
                        }
                    });
				}
			},
			fail: function (err) {
				wx.hideLoading();
				console.log(err);
			}
		});
	}
	// 登录态检查
	wx.checkSession({
		success: function () {
			console.log("Login state： not due");
            // userid校验
            if (!UserIdFun.isvalid()) {
                // 重新微信登录
                appWxLogin();
            }else{
                if(typeof(callback) != 'undefined'){
                    callback();
                }
            }
		},
		fail: function (){
			console.log("Login state： due");
			// 微信登录
            appWxLogin();
		}
	});
}
// 用户是否注册
function UserIsReg(self, callback){
    // 服务器校验是否为注册用户
    var userId = UserIdFun.get();
    var inData = {};
    inData.openId = userId;
    wx.request({
        url: Server["userIsReg"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var isNeedReg = dataObj['needRegister'];
            switch (isNeedReg) {
                case true:
                    // 注册
                    wx.reLaunch({
                        url: AppPages.pageReg
                    });
                    break;
                default:
                    // 已注册
                    getApp().globalData.role = dataObj['role'];
                    if (typeof (callback) != 'undefined') {
                        callback();
                    }
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
        }
    })
}
// 用户登录
function UserLogin(self, callback) {
    // 参数userid
    var userId = UserIdFun.get();
    var inData = {};
    inData.openId = userId;
    // 开始登陆
    wx.request({
        url: Server["userLogin"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                // 登录成功
                case CODEOK:
                    if (typeof (callback) != 'undefined') {
                        callback(dataObj);
                    }
                    break;
                default:
                    wx.showModal({
                        title: '提示',
                        content: '登录失败，点击重新登录',
                        showCancel: false,
                        success: function (res) {
                            UserLogin(self, callback);
                        }
                    });
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
        }
    })
}

Page({
    data:{
        loadok: 'slhide'
    },
    onLoad: function (options) {
		var self = this;
		// APP应用初始化
		AppInit(self, function () {
			// APP应用登录
			AppLogin(self, function () {
				// 是否注册
                UserIsReg(self, function(){
                    // 登陆
                    UserLogin(self, function(){
                        pageInit(self, function(){
                            // 跳转
                            var role = getApp().globalData.role;
                            switch (role){
                                case "courier":
                                    // 快递员
                                    wx.reLaunch({
                                        url: AppPages.pageHome
                                    });
                                    break;
                                case "user":
                                default:
                                    // 商户
                                    wx.reLaunch({
                                        url: AppPages.pageHome
                                    })
                            }
                        });
                    });
                });
			});
		});
    },
    onShow: function(){
        var self = this;
    }
});
// 初始化
function pageInit(self, callback){
    // 快递列表
    getExpressListServer(self, callback);
}
// 获取快递公司列表
function getExpressListServer(self, callback){
    // 参数userid
    var userId = UserIdFun.get();
    var inData = {};
    inData.openId = userId;
    wx.request({
        url: Server["expressList"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    var listData = addExpressAllObj(dataObj);
                    if (listData != ""){
                        getApp().globalData.expressList = listData;
                    }
                    if (typeof (callback) != 'undefined') {
                        callback();
                    }
                    break;
                default:
                    var msg = jsonData['msg'];
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
        }
    });
}