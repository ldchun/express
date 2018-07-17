var config = require('../../config.js');
var Server = config.service;
//  设置
var proName = "";
// 页面
var AppPages = {
	pageIndex: "/pages/index/index",
    pageHome: "/pages/home/home",
	pageInput: "/pages/input/input",
	pageTask: "/pages/task/task",
	pageTake: "/pages/take/take",
	pageReg: "/pages/reg/reg",
    pageMe: "/pages/me/me",
	pageMeInfo: "/pages/meinfo/meinfo",
	pageMeEdit: "/pages/meedit/meedit",
	pageRecord: "/pages/record/record",
    pageMycourier: "/pages/mycourier/mycourier",
    pageSearch: "/pages/search/search",
	pageWallet: "/pages/wallet/wallet",
    pageCourier: "/pages/courier/courier",
    pageCrrecord: "/pages/crrecord/crrecord"
};
//数组元素下标
function indexOfArray(arr, val) {
    if (!Array.indexOf) {
        Array.prototype.indexOf = function (el) {
            var index = -1;
            for (var i = 0, n = this.length; i < n; i++) {
                if (this[i] === el) {
                    index = i;
                    break;
                }
            }
            return index;
        }
    }
    return arr.indexOf(val);
}
//判断是否为数组类型
function isArray(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
}
//扩展输入 flag：true -> 默认深度拷贝
function extendOpt(defOpt, inOpt, flag) {
  var curFlag = true;
  curFlag = ((typeof (flag) != "undefined") && !flag) ? false : true;
  for (var para in inOpt) {
    var curOpt = inOpt[para];
    if (isArray(curOpt) && curFlag) {
      for (var i = 0, size = curOpt.length; i < size; i++) {
        defOpt[para][i] = curOpt[i];
      }
    }
    else {
      if ((typeof (curOpt) == "object")) {
        extendOpt(defOpt[para], curOpt, curFlag);
      }
      else {
        defOpt[para] = curOpt;
      }
    }
  }
  return defOpt;
}
/* 提示语显示封装 */
function wxShowToast(option) {
  var setting = { flag: "success", duration: 2000 };
  if (option === undefined) { option = {}; }
  if (typeof (option) === "object") {
    setting = extendOpt(setting, option);
  }
  var imageUrl = "../../asset/img/tip_success.png";
  switch (setting.flag){
    case "success":
      imageUrl = "../../asset/img/tip_success.png";
      break;
    case "fail":
      imageUrl = "../../asset/img/tip_fail.png";
      break;
    case "warn":
      imageUrl = "../../asset/img/tip_warn.png";
      break;
  }
  setting.image = imageUrl;
  wx.showToast(setting);
}
/* 字符串去掉空格 */
function trim(str, dir){
  var defdir = "lr";
  if (typeof (dir) !== "undefined") {
    defdir = dir;
  }
  switch(dir){
    case "lr":  //去左右空格
      str = str.replace(/(^\s*)|(\s*$)/g, "");
      break;
    case "l":   //去左空格
      str = str.replace(/(^\s*)/g, "");
      break;
    case "r":   //去右空格
      str = str.replace(/(\s*$)/g, "");
      break;
  }
  return str;
}
//获取时间的 年、月、日、星期
function DateInfo(time) {
  var addZero = function (val) {
    var value = (val < 10) ? ("0" + val) : val;
    return value.toString();
  }
  var date = new Date();
  if (typeof (time) != 'undefined') {
    date = new Date(time);
  }
  return {
    year: date.getFullYear(),
    month: addZero(date.getMonth() + 1),
    day: addZero(date.getDate()),
    week: date.getDay()
  };
}
// 时间处理函数
function DateFun(){
	var addZero = function (val) {
		var value = (val < 10) ? ("0" + val) : val;
		return value.toString();
	}
	this.info = function (time){
		var date = (typeof (time) != 'undefined') ? (new Date(time)) : (new Date());
		return {
			year: date.getFullYear(),
			month: addZero(date.getMonth() + 1),
			day: addZero(date.getDate()),
			week: date.getDay(),
			hour: addZero(date.getHours()),
			minute: addZero(date.getMinutes()),
			second: addZero(date.getSeconds()),
			ms: date.getMilliseconds()
		};
	};
	this.fat = function(time, options){
		// yyyymmdd->年月日，yyyymm->年月，yyyy->年, 
		// yyyymmdd hhmmss->年月日 时分秒, yyyymmdd hhmm->年月日 时分, yyyymmdd hh->年月日 时
		var setting = {
			mode: "yyyymmdd",
			join: "-"
		};
		if (options === undefined) { options = {}; }
		if (typeof (options) === "object") {
			for (var para in options) {
				setting[para] = options[para];
			}
		}
		var timeDate = (typeof (time) != 'undefined') ? this.info(time) : this.info();
		var joinStr = setting.join;
		var modeVal = setting.mode;
		var timeTxt = "";
		var timeVal = "";
		switch (modeVal) {
			case "yyyy":
				timeTxt = timeDate.year + "年";
				timeVal = timeDate.year;
				break;
			case "yyyymm":
				timeTxt = timeDate.year + "年" + timeDate.month + "月";
				timeVal = timeDate.year + joinStr + timeDate.month;
				break;
			case "yyyymmdd hhmmss":
				timeTxt = timeDate.year + "年" + timeDate.month + "月" + timeDate.day + "日" + timeDate.hour + "时" + timeDate.minute + "分" + timeDate.second + "秒";
				timeVal = timeDate.year + joinStr + timeDate.month + joinStr + timeDate.day + " " + timeDate.hour + ":" + timeDate.minute + ":" + timeDate.second;
				break;
			case "yyyymmdd hhmm":
				timeTxt = timeDate.year + "年" + timeDate.month + "月" + timeDate.day + "日" + timeDate.hour + "时" + timeDate.minute + "分";
				timeVal = timeDate.year + joinStr + timeDate.month + joinStr + timeDate.day + " " + timeDate.hour + ":" + timeDate.minute;
				break;
			case "yyyymmdd hh":
				timeTxt = timeDate.year + "年" + timeDate.month + "月" + timeDate.day + "日" + timeDate.hour + "时";
				timeVal = timeDate.year + joinStr + timeDate.month + joinStr + timeDate.day + " " + timeDate.hour;
				break;
			case "yyyymmdd":
			default:
				timeTxt = timeDate.year + "年" + timeDate.month + "月" + timeDate.day + "日";
				timeVal = timeDate.year + joinStr + timeDate.month + joinStr + timeDate.day;
		}
		return {
			txt: String(timeTxt),
			val: String(timeVal)
		};
	}
}
/* 对象转换成url */
function objToUrl(obj){
  var url = "";
}
//校验是否为空
function EmptyCheck(value, msg) {
  var res = true;
  if (value == '') {
    wx.showModal({
      title: '提示',
      content: msg,
      showCancel: false
    })
    res = false;
  }
  return res;
}
// 分享应用
var ShareApp = function (res){
    return {
        title: getApp().globalData.sharetips,
        path: AppPages.pageBan,
        success: function (res) {
            wxShowToast({
                title: '分享成功',
                flag: "success"
            })
        },
        fail: function (res) {
            wxShowToast({
                title: '分享失败',
                flag: "fail"
            })
        }
    }
}
// Session操作
var Session = {
    get: function (sessionkey) {
        return wx.getStorageSync(sessionkey) || null;
    },
    set: function (sessionkey, session) {
        wx.setStorageSync(sessionkey, session);
    },
    clear: function (sessionkey) {
        wx.removeStorageSync(sessionkey);
    },
};
// 用户Id操作函数
var UserIdFun = {
    userkey: "sessionuserid",
    isvalid: function () {
        var userId = Session.get(UserIdFun.userkey);
        return (userId === null) || (userId == '') ? false : true;
    },
    get: function () {
        var userId = Session.get(UserIdFun.userkey);
        return (userId === null) || (userId == '') ? false : userId;
    },
    set: function (userId) {
        Session.clear(UserIdFun.userkey);
        Session.set(UserIdFun.userkey, userId);
    },
    clear: function () {
        Session.clear(UserIdFun.userkey);
    }
};
var FormIdFun = {
    // 计算7天后的过期时间截
    expire: function () {
        return Math.floor(new Date().getTime() / 1000) + 604800;
    },
    // 计算7天后的过期时间截
    pushid: function (id) {
        var formId = id;
        var expire = FormIdFun.expire();
        var data = formId + "," + expire;
        var formIdArr = getApp().globalData.formIdArr;
        formIdArr.push(data);
        if(formIdArr.length > 10){
            formIdArr.shift();
        }
        getApp().globalData.formIdArr = formIdArr;
    },
    // 保存formIds
    save: function(){
        var formIdArr = getApp().globalData.formIdArr;
        do{
            if (formIdArr.length <= 0) {
                break;
            }
            var inData = {};
            inData.userId = UserIdFun.get();
            inData.formIds = "";
            inData.formIds = formIdArr.join("|");
            wx.request({
                url: Server.saveFormIds,
                data: inData,
                success: function (res) {
                    console.log(res.data);
                },
                fail: function (error) {
                    console.log(error)
                }
            })
            getApp().globalData.formIdArr = [];
        }while(0);
    }
};
// 快递公司
function ExpressCompanyFun(){
    // 快递列表
    this.express = function () {
        return getApp().globalData.expressList;
    };
	// 获取快递信息
	this.get = function(companyId){
        var companyListObj = this.express();
		return companyListObj[companyId];
	};
    this.arr = function (key) {
        var field = (typeof(key) != "undefined") ? key : "name";
        var companyListObj = this.express();
		var listArr = [];
		for (var para in companyListObj){
			var companyObj = companyListObj[para];
            listArr.push(companyObj[field]);
		}
		return listArr;
	};
    this.list = function () {
        var companyListObj = this.express();
        var listArr = [];
        for (var para in companyListObj) {
            var companyObj = companyListObj[para];
            if (typeof (companyObj["id"]) == "undefined"){
                companyObj.id = para;
            }
            listArr.push(companyObj);
        }
        return listArr;
    };
};
// 电话号码格式化
var MobileFun = {
    reset: function (val) {
        return val.replace(/-/g, "");
    },
    fat: function (val) {
        var mobile = "";
        var value = MobileFun.reset(val);
        var len = value.length;
        if (len <= 3) {
            mobile = value;
        }
        else if (len > 3 && len < 8) {
            mobile = value.slice(0, 3);
            mobile += "-" + value.slice(3);
        }
        else if (len >= 8) {
            mobile = value.slice(0, 3);
            mobile += "-" + value.slice(3, 7);
            mobile += "-" + value.slice(7);
        }
        return mobile;
    }
};
// 校验
var CheckFun = {
    "number": function (value) {
        var reg = /^[0-9]*[0-9]*$/;
        return reg.test(value);
    },
    "phone": function (value) {
        var reg = /^[1][3,4,5,6,7,8,9][0-9]{9}$/;
        return reg.test(value);
    },
    "parcel": function (value) {
        var reg = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
        return reg.test(value);
    }
};
// 商户列表
function ShopListFun(hasAll){
    // 商户
    this.shop = function(){
        var listArr = [].concat(getApp().globalData.shopList);
        var allOption = { id: "", smsAddress: "全部" };
        if ((typeof (hasAll) != "undefined") && hasAll) {
            listArr.unshift(allOption);
        }
        return listArr;
    };
    this.list = function () {
        var listArr = this.shop();
        return listArr;
    };
    // 获取商户信息
    this.get = function (value, key) {
        var field = (typeof (key) != "undefined") ? key : null;
        var listArr = this.list();
        var keyArr = this.arr(field);
        var index = indexOfArray(keyArr, value);
        return listArr[index];
    };
    this.arr = function (key) {
        var field = (typeof (key) != "undefined") ? key : "smsAddress";
        var listArr = this.list();
        var keyArr = [];
        for (var i = 0, len = listArr.length; i<len; i++) {
            var listObj = listArr[i];
            keyArr.push(listObj[field]);
        }
        return keyArr;
    };
};

/* 公共API接口定义 */
module.exports = {
    wxShowToast: wxShowToast,
    EmptyCheck: EmptyCheck,
    trim: trim,
    DateInfo: DateInfo,
	DateFun: DateFun,
    ShareApp: ShareApp,
    Session: Session,
    AppPages: AppPages,
    UserIdFun: UserIdFun,
    FormIdFun: FormIdFun,
	CompanyFun: ExpressCompanyFun,
    ShopFun: ShopListFun,
    MobileFun: MobileFun,
    CheckFun: CheckFun
}