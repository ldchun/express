/**
 * 小程序配置文件
 */
// 主机域名
var host = 'https://renxingstyle.xyz/express'; // prod生产地址
// host = "http://192.168.0.107:9000";
// host = "http://10.111.121.10:9000";
// host = "http://10.111.121.114:9000";
var config = {
    // 服务端
    service: {
        host,
    /************** 增加功能 ****************/
		// wx登录
		wxloginUrl: `${host}/user/getOpenId`,
		// 用户是否注册
		userIsReg: `${host}/user/needRegister`,
		// 用户注册
		userReg: `${host}/user/register`,
        // 用户登录
        userLogin: `${host}/user/login`,
        // 用户信息
        userInfo: `${host}/user/info`,
		// 更新用户信息
		userUpdate: `${host}/user/update`,
        
		// 统计信息
		parcelSum: `${host}/parcel/stat`,
		// 任务列表
		batchList: `${host}/parcel/pageBatch`,
		// 提交任务
		createBatch: `${host}/parcel/createBatch`,
		// 删除任务
		deleteBatch: `${host}/parcel/batchDelete`,
		// 任务信息
		batchInfo: `${host}/parcel/batchInfo`,

        // 图片识别号码
        extractMobile: `${host}/extractMobile`,
		// 语音识别电话
		audioCover: `${host}/audio/audioCover`,
		// 提交快递包裹
        submitParcel: `${host}/parcel/submitParcel`,
		// 领取快递包裹
		takeParcel: `${host}/parcel/takeParcel`,
		// 获取快递包裹信息
		getParcelInfo: `${host}/parcel/info`,
		// 获取快递包裹信息
		getParcelPosition: `${host}/parcel/positionCode`,
        // 包裹记录信息
        getParcelPage: `${host}/parcel/page`,
        // 搜索包裹记录
        searchParcel: `${host}/parcel/searchParcel`,
        // 包裹重发信息
        resendSmsParcel: `${host}/parcel/resendSms`,

		// 充值套餐列表
		payRechargeList: `${host}/pay/recharge/list`,
		// 支付回调
		payCallback: `${host}/pay/payCallback`,
		// 支付金额
		payOrderMoney: `${host}/pay/unifiedorder`,
        // 支付标识
        paySignTrade: `${host}/pay/signTrade`,
		
    }
};
module.exports = config;