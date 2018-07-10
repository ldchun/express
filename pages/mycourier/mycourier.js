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

Page({
    data:{
        loadok: 'slhide',
        hasResult: true,
        resultList: [],
        isLoading: false,
        isLoadComplete: false
    },
    onLoad: function (options) {
        var self = this;
    },
	onShow: function (e) {
		var self = this;
		// 获取信息
		getPageInfo(self);
	},
    handleCourier: function(e){
        var self = this;
        var dataset = e.currentTarget.dataset;
        handleCourierFun(self, dataset);
    }
});
// 操作
function handleCourierFun(self, data){
    var jsonData = data;
    var mobile = jsonData["mobile"];
    wx.showActionSheet({
        itemList: ["致电快递员", "复制快递员号码"],
        success: function (res) {
            var tapIndex = res.tapIndex;
            switch (tapIndex) {
                case 0: // 致电
                    wx.makePhoneCall({
                        phoneNumber: mobile
                    })
                    break;
                case 1: // 复制号码
                    wx.setClipboardData({
                        data: mobile,
                        success: function (res) {
                            wx.showToast({
                                title: "复制成功",
                                icon: 'none',
                                duration: 1000
                            });
                        }
                    })
                    break;
            }
        },
        fail: function (res) {
            console.log(res.errMsg)
        }
    });
}
// 处理列表数据
function fatListData(listData) {
    var resArr = [];
    var listArr = listData;
    var arrLen = listArr.length;
    for (var i = 0; i < arrLen; i++) {
        var dataObj = listArr[i];
        var dataTmp = {};
        // 快递员
        var companyInfo = CompanyFun.get(dataObj["fastName"]);
        dataTmp.companyId = dataObj["fastName"];
        dataTmp.companyName = companyInfo["name"];
        dataTmp.companyLogo = companyInfo["logo"];
        // 快递员
        var courierList = dataObj["courier"];
        var courierArr = [];
        for (var j = 0, num = courierList.length; j < num; j++){
            var courierObj = {};
            courierObj.sort = j + 1;
            courierObj.mobile = courierList[j];
            courierArr.push(courierObj);
        }
        dataTmp.courier = courierArr;
        resArr.push(dataTmp);
    }
    return resArr;
}
// 设置数据
function setPageInfo(self, data) {
	var jsonData = data;
    var listData = fatListData(jsonData);
    var hasResult = (listData.length > 0);
	self.setData({
        resultList: listData,
        hasResult: hasResult
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
        url: Server["userCourierList"],
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
						title: "获取快递员失败",
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