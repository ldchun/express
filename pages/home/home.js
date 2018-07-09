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
var screenHeight;
var delBtnWidth = 100;
var pageSize = 5;
var pageCurrent = 1;
//系统信息
var sysInfo = wx.getSystemInfoSync();
var pixelRatio = sysInfo.pixelRatio;
var screenWidth = sysInfo.windowWidth;
var screenHeight = sysInfo.windowHeight;
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}

Page({
    data:{
        loadok: 'slhide',
		sumTodayAll: 0,
		sumTodayHas: 0,
		sumTodayNot: 0,
		sumMonthAll: 0,
        takeNotListArr: [],
		taskNotListArr: [],
		isLoading: false,
		isLoadComplete: false,
		startX: 0,
    },
    onLoad: function (options) {
		var self = this;
        // loadPageInfo(self);
    },
    onShow: function(){
        var self = this;
		loadPageInfo(self);
    },
    onPullDownRefresh: function(){
        var self = this;
        loadPageInfo(self);
        wx.stopPullDownRefresh();
    },
	onReachBottom: function (e) {
		var self = this;
		// 加载更多
		// loadListData(self, false);
	},
    linkSearch: function (e) {
        wx.navigateTo({
            url: AppPages.pageSearch
        })
    },
	linkPageTask: function (e) {
		wx.navigateTo({
			url: AppPages.pageInput
		})
	},
	linkPageTake: function (e) {
		wx.navigateTo({
			url: AppPages.pageTake
		})
	},
	linkTaskNotGoOn: function (e) {
		var self = this;
		var dataset = e.currentTarget.dataset;
		wx.navigateTo({
            url: AppPages.pageRecord + "?companyid=" + dataset["companyid"] + "&starttime=" + dataset["starttime"] + "&endtime=" + dataset["endtime"]
		})
	},
	touchStart: function(e){
		var self = this;
		var allowDel = e.currentTarget.dataset.del;
		if (!allowDel) {
			return;
		}
		this.setData({
			startX: e.touches[0].clientX
		});
	},
	touchMove: function (e) {
		var self = this;
		var allowDel = e.currentTarget.dataset.del;
		if (!allowDel){
			return ;
		}
		var index = e.currentTarget.dataset.index;
		var moveX = e.touches[0].clientX;
		var disX = self.data.startX - moveX;
		var list = self.data.taskNotListArr;
		var indexDelClass = list[index].delClass;
		if (indexDelClass == ""){
			if (disX > delBtnWidth / 2) {
				list[index].delClass = "del";
				self.setData({
					taskNotListArr: list
				});
			}
		}else{
			if (disX < -1 * delBtnWidth / 2) {
				list[index].delClass = "";
				self.setData({
					taskNotListArr: list
				});
			}
		}
	},
	delCurrentTask: function(e){
		var self = this;
		var batchId = e.currentTarget.dataset.batchid;
		delTaskServer(self, batchId);
	}
});
// 统计信息
function delTaskServer(self, batchId) {
	var inData = new getInData();
	inData.batchId = batchId;
	wx.request({
		url: Server["deleteBatch"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
					wxShowToast({
						title: "删除成功",
						flag: "success"
					});
					// 更新列表
					loadPageInfo(self);
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: "删除失败",
						flag: "fail"
					});
			}
		},
		fail: function (err) {
			wx.hideLoading();
			console.log(err);
			wxShowToast({
				title: "删除失败",
				flag: "fail"
			});
		}
	})
}
// 加载
function loadPageInfo(self) {
	// 统计信息
	getSumInfo(self);
	// 未完成录入列表
    loadNotTakeList(self);
}
// 设置信息
function setSumInfo(self, jsonData) {
	self.setData({
		sumTodayAll: jsonData["toDayAllCount"],
		sumTodayHas: jsonData["todDayTakeCount"],
		sumTodayNot: jsonData["todDayNotTakeCount"],
		sumMonthAll: jsonData["toMonthAllCount"]
	});
}
// 统计信息
function getSumInfo(self) {
	var inData = new getInData();
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
					setSumInfo(self, dataObj);
					break;
				default:
					var msg = jsonData['msg'];
			}
		},
		fail: function (err) {
			wx.hideLoading();
			console.log(err);
		}
	})
}
// 列表加载
function loadNotTakeList(self) {
    var inData = new getInData();
    // 提交
    wx.request({
        url: Server["fastParcelInfo"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var dataObj = jsonData['data'];
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    updateNotTakeList(self, dataObj);
                    break;
                default:
                    var msg = jsonData['msg'];
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
        }
    })
}
// 处理未领取数据
function fatNotTakeListData(dataArr) {
    var resArr = [];
    var listArr = [].concat(dataArr);
    var arrLen = listArr.length;
    for (var i = 0; i < arrLen; i++) {
        var dataObj = listArr[i];
        var dataTmp = {};
        var companyInfo = CompanyFun.get(dataObj["fastName"]);
        dataTmp.companyId = dataObj["fastName"];
        dataTmp.companyName = companyInfo["name"];
        dataTmp.companyLogo = companyInfo["logo"];
        dataTmp.allCount = dataObj["allCount"];
        dataTmp.notCount = dataObj["notTakeCount"];
        if (dataTmp.notCount <= 0){
            continue ;
        }
        var startTimeObj = DateFun.fat(dataObj["startTime"], { mode: "yyyymmdd", join: "-" });
        dataTmp.startTime = startTimeObj.val;
        var endTimeObj = DateFun.fat(dataObj["endTime"], { mode: "yyyymmdd", join: "-" });
        dataTmp.endTime = endTimeObj.val;
        dataTmp.allowDel = false;
        resArr.push(dataTmp);
    }
    return resArr;
}
// 设置处理
function updateNotTakeList(self, data) {
    var dataArr = fatNotTakeListData(data);
    self.setData({
        takeNotListArr: dataArr
    });
}
// 处理未录入列表数据
function handleListData(dataArr){
	var listArr = [].concat(dataArr);
	var arrLen = listArr.length;
	for (var i = 0; i < arrLen; i++) {
		var dataObj = listArr[i];
		var dataTmp = {};
		var companyInfo = CompanyFun.get(dataObj["fastName"]);
		dataTmp.companyName = companyInfo["name"];
		dataTmp.companyLogo = companyInfo["logo"];
		dataTmp.allCount = dataObj["parcelCount"];
		dataTmp.notCount = dataObj["parcelCount"] - dataObj["completeCount"];
		var timeObj = DateFun.fat(dataObj["createTime"], { mode: "yyyymmdd hhmmss", join: "-"});
		dataTmp.createTime = timeObj.val;
		dataTmp.batchId = dataObj["batchId"];
		dataTmp.delClass = "";
		dataTmp.allowDel = (parseInt(dataObj["completeCount"]) == 0) ? true : false;
		listArr[i] = dataTmp;
	}
	return listArr;
}
// 列表加载
function taskNotListLoad(self) {
	self.setData({
		isLoading: false,
		isLoadComplete: false
	});
	loadListData(self, true);
}
// 请求列表 全部
function loadListData(self, isFirstLoad) {
	var isLoadComplete = self.data.isLoadComplete;
	if (isLoadComplete) {
		return;
	}
	// 当前页码
	pageCurrent = isFirstLoad ? 1 : pageCurrent + 1;
	//  提交
	var inData = new getInData();
	inData.isComplete = false;
	inData.currentPage = pageCurrent;
	inData.pageSize = pageSize;
	self.setData({
		isLoading: true,
		isLoadComplete: false
	});
	wx.request({
		url: Server["batchList"],
		data: inData,
		success: function (res) {
			wx.hideLoading();
			var jsonData = res.data;
			var dataObj = jsonData['data'];
			var code = jsonData['code'];
			switch (code) {
				case CODEOK:
					var listArr = dataObj["dataList"];
					var listLen = listArr.length;
					var countTotal = dataObj["allCount"];
					var countHave = (pageCurrent - 1) * pageSize + listLen;
					listArr = handleListData(listArr);
					var oldListArr = self.data.taskNotListArr;
					if (!isFirstLoad) {
						listArr = oldListArr.concat(listArr);
					}
					// 设置数据
					if (countHave >= countTotal) {
						self.setData({
							taskNotListArr: listArr,
							isLoading: false,
							isLoadComplete: true
						});
					} else {
						self.setData({
							taskNotListArr: listArr,
							isLoading: false,
							isLoadComplete: false
						});
					}
					// 判断是否自动加载更多
					var query = wx.createSelectorQuery();
					query.select('#homeElem').boundingClientRect(function (rect) {
						var contentHeight = rect.height;
						if (contentHeight <= screenHeight) {
							// 加载数据
							loadListData(self, false);
						}
					}).exec();
					break;
				default:
					var msg = jsonData['msg'];
					self.setData({
						isLoading: false,
						isLoadComplete: false
					});
			}
		},
		fail: function (err) {
			wx.hideLoading();
			console.log(err);
			self.setData({
				isLoading: false,
				isLoadComplete: false
			});
		}
	})
}