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
var pageSize = 5;
var pageCurrentAll = 1;
var pageCurrentNot = 1;
var pageCurrentHas = 1;
var screenHeight;
var hasReqFlag = [false, false, false];	// 请求标志位
// 时间选择
var choiceTimeOptions = [
    { name: 0, value: '全部时间', checked: 'true' },
    { name: 1, value: '选择时间段' }
];
// 快递
var companyList = CompanyFun.list();
var companyArr = CompanyFun.arr();
// 增加全部选项
function addCompanyAllOption(){
    var allOption = { id: "", name: "全部快递", briefname: "全部" };
    companyList.unshift(allOption);
    companyArr.unshift(allOption["name"]);
}
addCompanyAllOption();
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
// 获取请求参数
function getInData() {
	var inData = {};
	inData.openId = UserIdFun.get();
	return inData;
}
// 标签序号转状态
function tabIndexToStatus(index){
	var tabIndex = index;
	var status;
	switch (tabIndex) {
		case 1:
			status = 0;
			break;
		case 2:
			status = 1;
			break;
		case 0:
		default:
			status = -1;
	}
	return status;
}
// 包裹状态
function fatParcelStatus(status) {
    var statusTxt = "";
    status = parseInt(status);
    switch (status) {
        case 0:
            statusTxt = "未领取";
            break;
        case 1:
            statusTxt = "已领取";
            break;
    }
    return statusTxt;
}
// 判断是否已领取
function checkParcelIsTake(status) {
    status = parseInt(status);
    return (status == 1) ? true : false;
}
// 内容初始化
function clearTabContent(self) {
    hasReqFlag = [false, false, false];
    self.setData({
        recordListAll: [],
        recordListNot: [],
        recordListHas: [],
        countTotalAll: 0,
        countTotalNot: 0,
        countTotalHas: 0,
        isLoadingAll: false,
        isLoadCompleteAll: false,
        isLoadingNot: false,
        isLoadCompleteNot: false,
        isLoadingHas: false,
        isLoadCompleteHas: false
    });
}
// 时间picker列表
function getTimePickerList(self, rangStart, rangEnd){
    var maxDays = 60;
    var nowTimeVal = DateFun.fat(new Date())["val"];
    var nowTimeMs = new Date(nowTimeVal).getTime();
    var minTimeMs = nowTimeMs - 24 * 60 * 60 * 1000 * maxDays;
    // 需要取到 00:00的毫秒数
    var rangStartTimeVal = (typeof (rangStart) != 'undefined') ? DateFun.fat(rangStart)["val"] : nowTimeVal;
    var rangStartTimeMs = new Date(rangStartTimeVal).getTime();
    var rangEndTimeVal = (typeof (rangEnd) != 'undefined') ? DateFun.fat(rangEnd)["val"] : minTimeMs;
    var rangEndTimeMs = new Date(rangEndTimeVal).getTime();

    var timeList = [];
    for (var i = 0; i < maxDays; i++){
        var theTimeMs = rangStartTimeMs - 24 * 60 * 60 * 1000 * i;
        if (theTimeMs < rangEndTimeMs){
            break;
        }
        var theTime = DateFun.fat(new Date(theTimeMs))["val"];
        timeList.push(theTime);
    }
    return timeList;
}
// 设置时间选择
function setChoiceTimeItem(self, item) {
    var timeOptions = [].concat(choiceTimeOptions);
    for (var i = 0, len = timeOptions.length; i<len; i++){
        delete timeOptions[i]["checked"];
    }
    timeOptions[item]["checked"] = true;
    // 设置
    self.setData({
        choiceType: item,
        choiceItems: timeOptions
    });
}

// 弹窗显示
function timePopUpShow(self, flag) {
    var startTimeList = [];
    var endTimeList = [];
    if(flag){
        var nowTime = DateFun.fat(new Date())["val"];
        startTimeList = getTimePickerList(self);
        endTimeList = getTimePickerList(self, nowTime, nowTime);
        self.setData({
            startTime: nowTime,
            endTime: nowTime
        });
    }
    // 设置
    self.setData({
        startTimeList: startTimeList,
        endTimeList: endTimeList,
        popShow: flag
    });
}

Page({
	data: {
		loadok: 'slhide',
		tabList: ["全部", "未取", "已取"],
		tabIndex: 0,
        companyArray: companyArr,
        companyIndex: 0,
		recordListAll: [],
		recordListNot: [],
		recordListHas: [],
		countTotalAll: 0,
		countTotalNot: 0,
		countTotalHas: 0,
		isLoadingAll: false,
		isLoadCompleteAll: false,
		isLoadingNot: false,
		isLoadCompleteNot: false,
		isLoadingHas: false,
		isLoadCompleteHas: false,
        isChoiceTimeAll: true,
        choiceTimeStart: "",
        choiceTimeEnd: "",
        popShow: false,
        startTime: "",
        endTime: "",
        timeValue: ['', ''],
        startTimeList: [],
        endTimeList: [],
        choiceType: 0,
        choiceItems: choiceTimeOptions
	},
	onLoad: function (options) {
		var self = this;
		// 清空内容
        clearTabContent(self);
        timePopUpShow(self, false);
		wx.getSystemInfo({
			success: function(res) {
				screenHeight = res.windowHeight;
				// 加载数据
				var tabIndex = self.data.tabIndex;
				var status = tabIndexToStatus(tabIndex);
				// 默认加载当前选项
				loadListData(self, true, status);
				hasReqFlag[tabIndex] = true;
			}
		});
	},
    linkSearch: function(e){
        wx.navigateTo({
            url: AppPages.pageSearch
        })
    },
	tabClick: function (e) {
		var self = this;
		var index = parseInt(e.currentTarget.id);
        tabContentGo(self, index);
	},
	onReachBottom: function (e) {
		var self = this;
		// 加载更多
		var tabIndex = self.data.tabIndex;
		var status = tabIndexToStatus(tabIndex);
		loadListData(self, false, status);
	},
    handleMore: function(e){
        var self = this;
        var dataset = e.currentTarget.dataset;
        handleMoreFun(self, dataset);
    },
    bindPickerChange: function (e) {
        var self = this;
        self.setData({
            companyIndex: e.detail.value,
        });
        // 加载内容
        startLoadTabContent(self);
    },
    bindTimeChange: function (e) {
        var self = this;
        var value = e.detail.value;
        if ((self.data.startTimeList.length > 0) && (self.data.startTimeList.length > 0)){
            var startTimeVal = self.data.startTimeList[value[0]];
            var endTimeVal = self.data.endTimeList[value[1]];
            var diffTimeVal = (new Date(startTimeVal) - new Date(endTimeVal));
            if (diffTimeVal >= 0){
                endTimeVal = startTimeVal;
            }
            // 更新结束时间列表
            var endTimeList = getTimePickerList(self, new Date(), startTimeVal);
            self.setData({
                endTimeList: endTimeList,
                startTime: startTimeVal,
                endTime: endTimeVal
            });
        }
        console.log(this.data.startTime + " 至 " + this.data.endTime);
    },
    timePopShow: function(e){
        var self = this;
        timePopUpShow(self, true);
    },
    timePopCancle: function (e) {
        var self = this;
        timePopUpShow(self, false);
    },
    timePopOk: function (e) {
        var self = this;
        timePopUpShow(self, false);
        var choiceType = self.data.choiceType;
        // 设置选择结果
        self.setData({
            isChoiceTimeAll: (choiceType == 0),
            choiceTimeStart: self.data.startTime,
            choiceTimeEnd: self.data.endTime,
        });
        // 加载内容
        startLoadTabContent(self);
    },
    radioChange: function (e) {
        this.setData({
            choiceType: e.detail.value
        });
    }
});
// 开始加载内容
function startLoadTabContent(self){
    // 清空内容
    clearTabContent(self);
    //  加载内容
    tabContentGo(self, 0);
}
// 导航触发
function tabContentGo(self, index){
    var curIndex = index;
    self.setData({
        tabIndex: curIndex
    });
    if (!hasReqFlag[curIndex]) {
        var status = tabIndexToStatus(curIndex);
        loadListData(self, true, status);
        hasReqFlag[curIndex] = true;
    }
}
// 更多操作
function handleMoreFun(self, data) {
    var jsonData = data;
    var mobile = jsonData["mobile"];
    var isTake = jsonData["istake"];
    // 未取包裹 增加重发信息
    if (!isTake) {
        wx.showActionSheet({
            itemList: ["致电收件人", "重发信息", "复制收件人号码"],
            success: function (res) {
                var tapIndex = res.tapIndex;
                switch (tapIndex) {
                    case 0: // 致电收件人
                        wx.makePhoneCall({
                            phoneNumber: mobile
                        })
                        break;
                    case 1: // 重发信息
                        checkIsAllowSend(self, function(){
                            retrySendMsm(self, jsonData);
                        });
                        break;
                    case 2: // 复制收件人号码
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
    else {
        wx.showActionSheet({
            itemList: ["致电收件人", "复制收件人号码"],
            success: function (res) {
                var tapIndex = res.tapIndex;
                switch (tapIndex) {
                    case 0: // 致电收件人
                        wx.makePhoneCall({
                            phoneNumber: mobile
                        })
                        break;
                    case 1: // 复制收件人号码
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
}
// 重发信息
function retrySendMsm(self, data) {
    var jsonData = data;
    var inData = new getInData();
    inData.parcelId = jsonData["parcelid"];
    wx.showLoading({
        title: '加载中...',
    });
    wx.request({
        url: Server["resendSmsParcel"],
        data: inData,
        success: function (res) {
            wx.hideLoading();
            var jsonData = res.data;
            var code = jsonData['code'];
            switch (code) {
                case CODEOK:
                    wxShowToast({
                        title: "发送成功",
                        flag: "success"
                    });
                    break;
                default:
                    var msg = jsonData['msg'];
                    // 判断
                    wx.showModal({
                        title: '提示',
                        content: msg,
                        showCancel: false,
                        success: function (res) {
                            var msgRecharge = "请充值";
                            var isNeedRecharge = (msg.indexOf(msgRecharge) != -1);
                            if (isNeedRecharge) {
                                wx.navigateTo({
                                    url: AppPages.pageWallet
                                });
                            }
                        }
                    });
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
            wxShowToast({
                title: "发送失败",
                flag: "fail"
            });
        }
    })
}
// 判断是否允许
function checkIsAllowSend(self, callback) {
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
                    var allSmsCount = dataObj["smsCount"];
                    if (allSmsCount > 0) {
                        if (typeof callback != "undefined") {
                            callback();
                        }
                    } else {
                        wx.showModal({
                            title: '提示',
                            content: '余额不足，请充值',
                            showCancel: false,
                            success: function (res) {
                                wx.navigateTo({
                                    url: AppPages.pageWallet
                                })
                            }
                        });
                    }
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
    })
}
// 处理列表数据
function handleListData(dataArr, status) {
	var pageCurrent = pageCurrentAll;
	switch (status) {
		case 0: // 未取
			pageCurrent = pageCurrentNot;
			break;
		case 1:	// 已取
			pageCurrent = pageCurrentHas;
			break;
		case -1: // 全部
		default:
			pageCurrent = pageCurrentAll;
	}
    var listArr = [].concat(dataArr);
    var arrLen = listArr.length;
    for (var i = 0; i < arrLen; i++) {
        var dataObj = listArr[i];
        var dataTmp = {};
		dataTmp.sordId = (pageCurrent - 1) * pageSize + i + 1;
        var companyInfo = CompanyFun.get(dataObj["fastName"]);
        dataTmp.companyName = companyInfo["name"];
        dataTmp.companyLogo = companyInfo["logo"];
        dataTmp.phoneNumber = dataObj["mobile"];
        dataTmp.parcelNumber = dataObj["parcelNumber"];
        dataTmp.posNumber = dataObj["positionCode"];
        dataTmp.parcelStatus = fatParcelStatus(dataObj["status"]);
        dataTmp.isTake = checkParcelIsTake(dataObj["status"]);
        dataTmp.parcelId = dataObj["id"];
        // 时间
        var timeObj = DateFun.fat(dataObj["createTime"], { mode: "yyyymmdd hhmmss", join: "-" });
        dataTmp.createTime = timeObj.val;
        dataTmp.batchId = dataObj["batchId"];
        listArr[i] = dataTmp;
    }
    return listArr;
}
// 请求列表
function loadListData(self, isFirstLoad, status) {
	var isLoadComplete = self.data.isLoadCompleteAll;
	var pageCurrent = pageCurrentAll;
	switch (status) {
		case 0: // 未取
			isLoadComplete = self.data.isLoadCompleteNot;
			pageCurrent = pageCurrentNot;
			break;
		case 1:	// 已取
			isLoadComplete = self.data.isLoadCompleteHas;
			pageCurrent = pageCurrentHas;
			break;
		case -1: // 全部
		default:
			isLoadComplete = self.data.isLoadCompleteAll;
			pageCurrent = pageCurrentAll;
	}
	if (isLoadComplete){
		return ;
	}
	// 当前页码
	pageCurrent = isFirstLoad ? 1 : pageCurrent+1;
	//  提交
    var inData = new getInData();
	inData.status = status;
	inData.currentPage = pageCurrent;
    inData.pageSize = pageSize;
    var companyId = companyList[self.data.companyIndex]["id"];
    console.log(companyId);
    if (companyId != ""){
        inData.fastName = companyId;
    }
    if (!self.data.isChoiceTimeAll){
        inData.startTime = self.data.choiceTimeStart;
        inData.endTime = self.data.choiceTimeEnd;
    }
	switch (status) {
		case 0: // 未取
			pageCurrentNot = pageCurrent;
			self.setData({
				isLoadingNot: true,
				isLoadCompleteNot: false
			});
			break;
		case 1:	// 已取
			pageCurrentHas = pageCurrent;
			self.setData({
				isLoadingHas: true,
				isLoadCompleteHas: false
			});
			break;
		case -1: // 全部
		default:
			pageCurrentAll = pageCurrent;
			self.setData({
				isLoadingAll: true,
				isLoadCompleteAll: false
			});
	}
    wx.request({
        url: Server["getParcelPage"],
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
					listArr = handleListData(listArr, status);
					var oldListArr = self.data.recordListAll;
					switch (status) {
						case 0: // 未取
							oldListArr = self.data.recordListNot;
							break;
						case 1:	// 已取
							oldListArr = self.data.recordListHas;
							break;
						case -1: // 全部
						default:
							oldListArr = self.data.recordListAll;
					}
					if (!isFirstLoad) {
						listArr = oldListArr.concat(listArr);
                    }
					// 设置数据
					switch (status) {
						case 0: // 未取
							if (countHave >= countTotal) {
								self.setData({
									countTotalNot: countTotal,
									recordListNot: listArr,
									isLoadingNot: false,
									isLoadCompleteNot: true
									
								});
							} else {
								self.setData({
									countTotalNot: countTotal,
									recordListNot: listArr,
									isLoadingNot: false,
									isLoadCompleteNot: false
								});
							}
							break;
						case 1:	// 已取
							if (countHave >= countTotal) {
								self.setData({
									countTotalHas: countTotal,
									recordListHas: listArr,
									isLoadingHas: false,
									isLoadCompleteHas: true
								});
							} else {
								self.setData({
									countTotalHas: countTotal,
									recordListHas: listArr,
									isLoadingHas: false,
									isLoadCompleteHas: false
								});
							}
							break;
						case -1: // 全部
						default:
							if (countHave >= countTotal) {
								self.setData({
									countTotalAll: countTotal,
									recordListAll: listArr,
									isLoadingAll: false,
									isLoadCompleteAll: true
								});
							} else {
								self.setData({
									countTotalAll: countTotal,
									recordListAll: listArr,
									isLoadingAll: false,
									isLoadCompleteAll: false
								});
							}
					}
					// 判断是否自动加载更多
					var query = wx.createSelectorQuery();
					query.select('#tabContent').fields({
						size: true,
					}, function (res) {
						var contentHeight = res.height;
						if (contentHeight <= screenHeight){
							// 加载数据
							loadListData(self, false, status);
						}
					}).exec();
                    break;
                default:
                    var msg = jsonData['msg'];
                    wxShowToast({
                        title: msg,
                        flag: "fail"
                    });
					switch (status) {
						case 0: // 未取
							self.setData({
								isLoadingNot: false,
								isLoadCompleteNot: false
							});
							break;
						case 1:	// 已取
							self.setData({
								isLoadingHas: false,
								isLoadCompleteHas: false
							});
							break;
						case -1: // 全部
						default:
							self.setData({
								isLoadingAll: false,
								isLoadCompleteAll: false
							});
					}
            }
        },
        fail: function (err) {
            wx.hideLoading();
            console.log(err);
            wxShowToast({
                title: "加载失败",
                flag: "fail"
            });
			switch (status) {
				case 0: // 未取
					self.setData({
						isLoadingNot: false,
						isLoadCompleteNot: false
					});
					break;
				case 1:	// 已取
					self.setData({
						isLoadingHas: false,
						isLoadCompleteHas: false
					});
					break;
				case -1: // 全部
				default:
					self.setData({
						isLoadingAll: false,
						isLoadCompleteAll: false
					});
			}
        }
    })
}

// 请求列表 全部
function loadListDataAll(self, isFirstLoad) {
	var isLoadComplete = self.data.isLoadCompleteAll;
	if (isLoadComplete) {
		return;
	}
	// 当前页码
	pageCurrentAll = isFirstLoad ? 1 : pageCurrentAll + 1;
	//  提交
	var inData = new getInData();
	inData.status = -1;
	inData.currentPage = pageCurrentAll;
	inData.pageSize = pageSize;
	// inData.startTime = "2018-06-02";
	// inData.endTime = "2018-06-10";
	self.setData({
		isLoadingAll: true,
		isLoadCompleteAll: false
	});
	wx.request({
		url: Server["getParcelPage"],
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
					var countHave = (pageCurrentAll - 1) * pageSize + listLen;
					listArr = handleListData(listArr, -1);
					var oldListArr = self.data.recordListAll;
					if (!isFirstLoad) {
						listArr = oldListArr.concat(listArr);
					}
					// 设置数据
					if (countHave >= countTotal) {
						self.setData({
							countTotalAll: countTotal,
							recordListAll: listArr,
							isLoadingAll: false,
							isLoadCompleteAll: true
						});
					} else {
						self.setData({
							countTotalAll: countTotal,
							recordListAll: listArr,
							isLoadingAll: false,
							isLoadCompleteAll: false
						});
					}
					// 判断是否自动加载更多
					var query = wx.createSelectorQuery();
					query.select('#tabContent').fields({
						size: true,
					}, function (res) {
						var contentHeight = res.height;
						if (contentHeight <= screenHeight) {
							// 加载数据
							loadListDataAll(self, false);
						}
					}).exec();
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: msg,
						flag: "fail"
					});
					self.setData({
						isLoadingAll: false,
						isLoadCompleteAll: false
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
			self.setData({
				isLoadingAll: false,
				isLoadCompleteAll: false
			});
		}
	})
}
// 请求列表 未取
function loadListDataNot(self, isFirstLoad) {
	var isLoadComplete = self.data.isLoadCompleteNot;
	if (isLoadComplete) {
		return;
	}
	// 当前页码
	pageCurrentNot = isFirstLoad ? 1 : pageCurrentNot + 1;
	//  提交
	var inData = new getInData();
	inData.status = 0;
	inData.currentPage = pageCurrentNot;
	inData.pageSize = pageSize;
	// inData.startTime = "2018-06-02";
	// inData.endTime = "2018-06-10";
	self.setData({
		isLoadingNot: true,
		isLoadCompleteNot: false
	});
	wx.request({
		url: Server["getParcelPage"],
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
					listArr = handleListData(listArr, 0);
					var oldListArr = self.data.recordListNot;
					if (!isFirstLoad) {
						listArr = oldListArr.concat(listArr);
					}
					// 设置数据
					if (countHave >= countTotal) {
						self.setData({
							countTotalNot: countTotal,
							recordListNot: listArr,
							isLoadingNot: false,
							isLoadCompleteNot: true

						});
					} else {
						self.setData({
							countTotalNot: countTotal,
							recordListNot: listArr,
							isLoadingNot: false,
							isLoadCompleteNot: false
						});
					}
					// 判断是否自动加载更多
					var query = wx.createSelectorQuery();
					query.select('#tabContent').fields({
						size: true,
					}, function (res) {
						var contentHeight = res.height;
						if (contentHeight <= screenHeight) {
							// 加载数据
							loadListDataNot(self, false);
						}
					}).exec();
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: msg,
						flag: "fail"
					});
					self.setData({
						isLoadingNot: false,
						isLoadCompleteNot: false
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
			self.setData({
				isLoadingNot: false,
				isLoadCompleteNot: false
			});
		}
	})
}

// 请求列表 已取
function loadListDataHas(self, isFirstLoad, status) {
	var isLoadComplete = self.data.isLoadCompleteHas;
	if (isLoadComplete) {
		return;
	}
	// 当前页码
	pageCurrentHas = isFirstLoad ? 1 : pageCurrentHas + 1;
	//  提交
	var inData = new getInData();
	inData.status = 1;
	inData.currentPage = pageCurrentHas;
	inData.pageSize = pageSize;
	// inData.startTime = "2018-06-02";
	// inData.endTime = "2018-06-10";
	self.setData({
		isLoadingHas: true,
		isLoadCompleteHas: false
	});
	wx.request({
		url: Server["getParcelPage"],
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
					var countHave = (pageCurrentHas - 1) * pageSize + listLen;
					listArr = handleListData(listArr, 1);
					var oldListArr = self.data.recordListHas;
					if (!isFirstLoad) {
						listArr = oldListArr.concat(listArr);
					}
					// 设置数据
					if (countHave >= countTotal) {
						self.setData({
							countTotalHas: countTotal,
							recordListHas: listArr,
							isLoadingHas: false,
							isLoadCompleteHas: true
						});
					} else {
						self.setData({
							countTotalHas: countTotal,
							recordListHas: listArr,
							isLoadingHas: false,
							isLoadCompleteHas: false
						});
					}
					// 判断是否自动加载更多
					var query = wx.createSelectorQuery();
					query.select('#tabContent').fields({
						size: true,
					}, function (res) {
						var contentHeight = res.height;
						if (contentHeight <= screenHeight) {
							// 加载数据
							loadListDataHas(self, false);
						}
					}).exec();
					break;
				default:
					var msg = jsonData['msg'];
					wxShowToast({
						title: msg,
						flag: "fail"
					});
					self.setData({
						isLoadingHas: false,
						isLoadCompleteHas: false
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
			self.setData({
				isLoadingHas: false,
				isLoadCompleteHas: false
			});
		}
	})
}