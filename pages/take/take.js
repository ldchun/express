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
// 提示音
var innerAudioContext;
var serverAudioSrc = {
    "success": "https://renxingstyle.xyz/media/success.mp3"
};
var localAudioSrc = {
    "success": ""
};
// 下载音频文件，生成本地路径
function downLoadAudioFile() {
    // 正确
    wx.downloadFile({
        url: serverAudioSrc["success"],
        success: function (res) {
            if (res.statusCode === 200) {
                localAudioSrc["success"] = res.tempFilePath;
            }
        }
    })
}
// 成功提示音
function tipVoiceFun(handle) {
    // 音源
    var voiceSrc = localAudioSrc["success"];
    innerAudioContext.src = voiceSrc;
    // 操作
    switch (handle) {
        case "start":
            innerAudioContext.stop();
            innerAudioContext.seek(0);
            innerAudioContext.play();
            break;
        case "pause":
            innerAudioContext.pause();
            break;
        case "stop":
        default:
            innerAudioContext.stop();
            innerAudioContext.seek(0);
    }
}
// 弹窗显示
function popWinShow(self, data) {
	var jsonData = data;
	var flag = !(jsonData == false);
	var popShowClass = flag ? "on" : "";
	var companyName = "";
	var phoneNumber = flag ? jsonData["mobile"] : "";
	var parcelNumber = flag ? jsonData["parcelNumber"] : "";
    var posNumber = flag ? jsonData["positionCode"] : "";
	var createTime = "";
	if(flag){
		// 名称
		var theCompanyId = jsonData["fastName"];
		var companyInfo = CompanyFun.get(theCompanyId);
        companyName = companyInfo["name"];
		// 创建时间
		var timeObj = DateFun.fat(jsonData["createTime"], { mode: "yyyymmdd hhmmss", join: "-" });
		createTime = timeObj.val;
	}
	// 设置
	self.setData({
		infoCompanyName: companyName,
		infoPhoneNumber: phoneNumber,
		infoParcelNumber: parcelNumber,
        infoPosNumber: posNumber,
		infoCreateTime: createTime,
		popShow: popShowClass
	});
}
// 领取成功
function popTakeOkWin(self, data) {
	var jsonData = data;
	var flag = !(jsonData == false);
	var popOkShowClass = flag ? "on" : "";
	var companyName = "";
	var phoneNumber = flag ? jsonData["mobile"] : "";
	var parcelNumber = flag ? jsonData["parcelNumber"] : "";
	var takeTime = "";
	if (flag) {
		// 名称
		var theCompanyId = jsonData["fastName"];
		var companyInfo = CompanyFun.get(theCompanyId);
        companyName = companyInfo["name"];
		// 创建时间
		var timeObj = DateFun.fat(jsonData["takeTime"], { mode: "yyyymmdd hhmmss", join: "-" });
		takeTime = timeObj.val;
	}
	// 设置
	self.setData({
		takeCompanyName: companyName,
		takePhoneNumber: phoneNumber,
		takeParcelNumber: parcelNumber,
		popOkShow: popOkShowClass
	});
}
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}
// 清除框
function clearOneInBox(self, flag){
	var focus = (typeof (flag) != "undefined") ? flag : true;
	self.setData({
		inputFocus: focus,
		takeNumber: "",
		inVal0: "",
		inVal0Class: "",
		inVal1: "",
		inVal1Class: "",
		inVal2: "",
		inVal2Class: "",
		inVal3: "",
		inVal3Class: "",
		inVal4: "",
		inVal4Class: ""
	});
}

Page({
    data:{
        loadok: 'slhide',
		popShow: "",
		popOkShow: "",
		inputMaxLen: 4,
		inputFocus: true,
        inputPos:false,
		takeNumber: "",
		inVal0: "",
		inVal0Class: "",
		inVal1: "",
		inVal1Class: "",
		inVal2: "",
		inVal2Class: "",
		inVal3: "",
		inVal3Class: "",
		inVal4: "",
		inVal4Class: "",
		infoCompanyName: "",
		infoPhoneNumber: "",
		infoParcelNumber: "",
        infoPosNumber: "",
		infoCreateTime: "",
		takeParcelNumber: "",
		takeCompanyName: "",
		takePhoneNumber: ""
    },
    onLoad: function (options) {
        var self = this;
		popWinShow(self, false);
		popTakeOkWin(self, false);
        // 下载音频文件
        downLoadAudioFile();
        // 创建音频上下文
        innerAudioContext = wx.createInnerAudioContext();
    },
	enableOneInput: function(){
		var self = this;
		self.setData({
			inputFocus: true
		});
	},
	inputTakeNumber: function (e) {
		var self = this;
		var inVal = common.trim(e.detail.value);
		inVal = inVal.replace(/\s+/g, "");
		var inValLen = inVal.length;
		var inValMaxLen = self.data.inputMaxLen;
		if (inValLen <= inValMaxLen){
			self.setData({
				takeNumber: inVal
			});
			// 同步输入值
			oneinValSync(self, inVal);
		}
	},
	popWinCancle: function(e){
		var self = this;
		popWinShow(self, false);
		clearOneInBox(self);
	},
	popWinOk: function (e) {
		var self = this;
		// 提交服务器
		submitTakeParcel(self);
	},
	popOkWinOk: function (e) {
		var self = this;
		popTakeOkWin(self, false);
		clearOneInBox(self);
	}
});
// 同步输入值
function oneinValSync(self, value){
	var inVal = value;
	var inValLen = inVal.length;
	var inValMaxLen = self.data.inputMaxLen;
	var valClass = "on";
	var inVal0 = "", inVal1 = "", inVal2 = "", inVal3 = "", inVal4 = "";
	var inVal0Class = "", inVal1Class = "", inVal2Class = "", inVal3Class = "", inVal4Class = "";
	for (var i = 0; i < inValMaxLen; i++){
		var isInOn = (i < inValLen);
		var indexVal = inVal.charAt(i);
		switch(i){
			case 0:
				inVal0 = isInOn ? indexVal : "";
				inVal0Class = isInOn ? valClass : "";
				break;
			case 1:
				inVal1 = isInOn ? indexVal : "";
				inVal1Class = isInOn ? valClass : "";
				break;
			case 2:
				inVal2 = isInOn ? indexVal : "";
				inVal2Class = isInOn ? valClass : "";
				break;
			case 3:
				inVal3 = isInOn ? indexVal : "";
				inVal3Class = isInOn ? valClass : "";
				break;
			case 4:
				inVal4 = isInOn ? indexVal : "";
				inVal4Class = isInOn ? valClass : "";
				break;
		}
	}
	// 设置值
	self.setData({
		inVal0: inVal0,
		inVal0Class: inVal0Class,
		inVal1: inVal1,
		inVal1Class: inVal1Class,
		inVal2: inVal2,
		inVal2Class: inVal2Class,
		inVal3: inVal3,
		inVal3Class: inVal3Class,
		inVal4: inVal4,
		inVal4Class: inVal4Class
	});
	if (inValLen >= inValMaxLen){
		// 获取包裹信息
		getParcelInfo(self);
		// 输入完成
		self.setData({
			inputFocus: false
		});
	}
}
// 包裹信息
function getParcelInfo(self){
	wx.showLoading({
		title: '加载中...',
	})
	var inTakeNumber = self.data.takeNumber;
	var inData = new getInData();
	inData.takeCode = inTakeNumber;
	wx.request({
		url: Server["getParcelInfo"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
					var status = dataObj["status"];
					if (status == 0){
						popWinShow(self, dataObj);
					} 
                    else if ((status == 1) || (status == 3)){
						popWinShow(self, false);
                        var contentStr = (status == 3) ? "包裹已被无取件码领取！" : "包裹已被领取！"
						wx.showModal({
							title: '提示',
                            content: contentStr,
							showCancel: false,
							success: function (res) {
								clearOneInBox(self);
							}
						});
					}
					break;
				default:
					var msg = jsonData['msg'];
					wx.showModal({
						title: '提示',
						content: msg,
						showCancel: false,
						success: function (res) {
							clearOneInBox(self);
						 }
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
	})
}
// 提交任务到server
function submitTakeParcel(self){
	wx.showLoading({
		title: '加载中...',
	})
	var inTakeNumber = self.data.takeNumber;
	var inData = new getInData();
	inData.takeCode = inTakeNumber;
    inData.status = 0; // 正常取件
	wx.request({
		url: Server["takeParcel"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
					// 取件成功
					popTakeOkWin(self, dataObj);
                    // 提示音
                    tipVoiceFun("start");
					break;
				default:
					var msg = jsonData['msg'];
					wx.showModal({
						title: '提示',
						content: msg,
						showCancel: false,
						success: function (res) {
							clearOneInBox(self);
						}
					});
			}
			popWinShow(self, false);
		},
		fail: function (err) {
			wx.hideLoading();
			console.log(err);
			wxShowToast({
				title: "加载失败",
				flag: "fail"
			});
		}
	})
}
