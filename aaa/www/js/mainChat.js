/**
 * Created by 彭俊国 on 2017/6/23 0023.
 */

$(function() {
	$('.message_list').slimScroll({
		height: '500px'
	});
	//  $('.show_bb').slimScroll({
	//      height: '500px'
	//  });

	var logFormData = {};
	logFormData.func = 'appinfo_list';
	logFormData.account = html_name('userid');
	logFormData.oid = html_name('id');
	$.ajax({
		method: 'POST',
		url: ips+"/ajax.post",
		data: $.param(logFormData), // pass in data as strings 序列化对象的结果 变为width=1680&height=1050
		success: function(result) {
			//					下面是联系人表的对接
			if(result.状态 === "成功") {
				$('.kefu_img_sp').html(result.昵称);
				if(result.权限 != '1'){
					$(".sjtj-btn").hide();
				}
				// result.linkman.forEach(function(name, key) {
				// 	var str = name.组名 + "_" + name.昵称;

				// 	$('#linkman').append('<li class="list_item list_item_' + name.账号 + '_service" id=' + name.账号 + '_service onclick="messageRecord(\'list_item_' + name.账号 + '_service\',searchkey)"><img src="images/team-18.png"><b style="display: none;">' + name.账号 + '</b><span class="sp_users names">' + str + '</span></li>')
				// })
				result.linkman2.forEach(function(name, key) {
					var str = name.组名 + "_" + name.昵称;

					$('#linkman2').append('<li class="list_item list_item_' + name.账号 + '_service" id=' + name.账号 + '_service onclick="messageRecord(\'list_item_' + name.账号 + '_service\',searchkey)"><img src="images/team-18.png"><b style="display: none;">' + name.账号 + '</b><span class="sp_users names">' + str + '</span></li>')
				})
			} else {
				alert(result.状态);
				return false;
			}
		}
	});
})

/*function a(){
	console.log(11)
}*/

//左边消息记录点击事件

//下面是为联系人和消息记录增加hover效果