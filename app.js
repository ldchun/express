var config = require('./config');
var common = require('./asset/js/common.js');
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
// 默认快递
var logoImgPath = "../../asset/image/";
var expressListClient = {
    "yuantong": { id:"yuantong", name: "圆通快递", briefname: "圆通", logo: logoImgPath + "logo_yuantong.png" },
    "zhongtong": { id: "zhongtong", name: "中通快递", briefname: "中通", logo: logoImgPath + "logo_zhongtong.png" },
    "yunda": { id: "yunda", name: "韵达快递", briefname: "韵达", logo: logoImgPath + "logo_yunda.png" },
    "baishi": { id: "baishi", name: "百世快递", briefname: "百世", logo: logoImgPath + "logo_baishi.png" },
    "shentong": { id: "shentong", name: "申通快递", briefname: "申通", logo: logoImgPath + "logo_shentong.png" },
    "shunfeng": { id: "shunfeng", name: "顺丰快递", briefname: "顺丰", logo: logoImgPath + "logo_shunfeng.png" },
    "youzheng": { id: "youzheng", name: "中国邮政", briefname: "邮政", logo: logoImgPath + "logo_youzheng.png" },
    "tiantian": { id: "tiantian", name: "天天快递", briefname: "天天", logo: logoImgPath + "logo_tiantian.png" },
    "jindong": { id: "jindong", name: "京东物流", briefname: "京东", logo: logoImgPath + "logo_jindong.png" },
    "ems": { id: "ems", name: "EMS", briefname: "EMS", logo: logoImgPath + "logo_ems.png" },
    "debang": { id: "debang", name: "德邦物流", briefname: "德邦", logo: logoImgPath + "logo_debang.png" }
};
// 获取请求参数
function getInData(){
    var inData = {};
    inData.openId = UserIdFun.get();
    return inData;
}
App({
    onLaunch: function (options) {
        var self = this;
	},
    onShow: function (options) {
        var self = this;
	},
	onHide: function () {
	},
	globalData: {
        role: "",
        shopList: [],
        expressList: expressListClient
	}
});