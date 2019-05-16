/*[网址元素*/
var ips = 'http://120.79.224.38:9988';
// var ips = 'http://127.0.0.1:9988';
function html_name(name) {

	html = window.location.search;
	arr_html = html.split("?");
	if (arr_html.length > 1) {
		arr_html = arr_html[1].split("&");

		for (i = 0; i < arr_html.length; i++) {
			arr_b = arr_html[i].split("=");
			if (arr_b[0] == name) {
				return arr_b['1'];
				break;
			}

		}

		return '';
	} else
		return '';
}
var account = sessionStorage.getItem('user_id');
var random = decodeURI(html_name('random'));
var socket = 1;
var socketuuid = 0;
var searchkey;

$('#search').click(function () {
	searchkey = $(this).parent().find('#searchs').val();
	$('.lights').click();
})
/*
 * 可测试远程的，但是要改80行代码参数及其他ajax中的url参数！！！！！！
 */
//链接
function connection() {
	url = $('#url').val();
	if (url == '') {
		alert('输入url,远程的是http://:8082,本地是http://localhost:8082');
		return false
	} else {
		alert('要测远程直接改80行代码')
	}

}










var myDB = {
	dbName: 'chat',
	version: 1,
	objectStore1: 'user_chat_list',
	objectStore2: 'user_chat_content',
	objectStore3: 'service_chat_list',
	objectStore4: 'service_chat_content'
};

function leftList(data, no) {
	while ($(".message_list .list_item_" + data.sendId).length > 0) {
		$(".message_list .list_item_" + data.sendId).remove();
	}
	if (no == 'no') {
		if (data.sendId.substr(data.sendId.length - 8) == "_service") {
			$("#message_list").prepend('<li class="list_item list_item_' + data.sendId + '" id = "' + data.sendId + '" onclick="messageRecord(\'list_item_' + data.sendId + '\',searchkey)"><img src="images/team-18.png" width="40px" height="40px"> <span class="sp_user names">客服-' + data.sendName + '</span> <span class="sp_content">' + data.pushData + '</span> <span class="sp_sendtime">' + data.sendTime + '</span> </li>')
		} else {
			$("#message_list").prepend('<li class="list_item list_item_' + data.sendId + '" id = "' + data.sendId + '" onclick="messageRecord(\'list_item_' + data.sendId + '\',searchkey)"><img src="' + data.portrait + '" width="40px" height="40px"> <span class="sp_user names">' + data.sendName + '</span> <span class="sp_content">' + data.pushData + '</span> <span class="sp_sendtime">' + data.sendTime + '</span> </li>')
		}
	} else {
		if (data.sendId.substr(data.sendId.length - 8) == "_service") {
			$("#message_list").prepend('<li class="list_item list_item_' + data.sendId + '" id = "' + data.sendId + '" onclick="messageRecord(\'list_item_' + data.sendId + '\',searchkey)"><img src="images/team-18.png" width="40px" height="40px"> <span class="sp_user names">客服-' + data.sendName + '</span> <span class="sp_content">' + data.pushData + '</span> <span class="sp_sendtime">' + data.sendTime + '</span> <span class ="message_num">' + data.number + '</span></li>')
		} else {
			$("#message_list").prepend('<li class="list_item list_item_' + data.sendId + '" id = "' + data.sendId + '" onclick="messageRecord(\'list_item_' + data.sendId + '\',searchkey)"><img src="' + data.portrait + '" width="40px" height="40px"> <span class="sp_user names">' + data.sendName + '</span> <span class="sp_content">' + data.pushData + '</span> <span class="sp_sendtime">' + data.sendTime + '</span> <span class ="message_num">' + data.number + '</span></li>')
		}
	}

}

//用户还未接入的情况  在右侧显示用户
function rightList(data) {
	while ($("#jieru_list .jieru_" + data.sendId).length > 0) {
		$("#jieru_list .jieru_" + data.sendId).remove();
	}
	if ($("#jieru_list .jieru").length >= 9) {//每页显示9条
		$("#jieru_list").find(".jieru").eq(-1).remove();

		if ($("#jieru_number .number-max").text() == 1) {
			//生成分页按钮块
			$("#jieru_number .number-max").text(2);
			$("#jieru_number .num-context").append('<span onclick="jieru_user_list(\'' + 2 + '\')">' + 2 + '</span>');
		}

	}

	$("#jieru_list").prepend('<div class="jieru jieru_' + data.sendId + '">'
		+ '<div class="jieru-content">'
		+ '<div class="jieru_img" style="float: left;"><img src="' + data.portrait + '" style="border-radius:50%; overflow:hidden;" height="40px" width="40px;" /></div>'
		+ '<div class="jieru_text" style="float: left;"><p>' + data.pushData + '</p></div>'
		+ '</div>'
		+ '<div class="jieru-mask">'
		+ '<div class="jieru-btn reply-btn" onclick="huifu(\'' + data.sendId + '\')">去回复</div>'
		+ '<div class="jieru-btn look-detail" onclick="chakan(\'' + data.sendId + '\')">查看详情</div>'
		+ '</div>'
		+ '</div>');
}
//接入用户
function huifu(sendId) {
	$('.jieru-msg-list').html('');
	$('.msg-btn').html('');
	$('.jieru_msg').hide();
	//向后台表示已经被我接受
	var data = { 'userid': sendId, "services": account };
	$.ajax({
		type: "POST",
		url: ips + "/ajax.post?func=service_jieru_user",
		data: $.param(data),
		success: function (res) {
			var num_ys = $("#jieru_number .number-dq").text();
			if (res.状态 != '成功') {
				alert(res.状态);
				if (res.状态 == "用户已被其他客服接入") {
					$($('.jieru_' + sendId)).remove();
					jieru_user_list(num_ys);
				}
				return;
			}
			var nc = $('.kefu_img_sp').text();
			//打开聊天窗口
			openDB(myDB.dbName, myDB.version, function (db) {
				var store1 = storeOfRW(db, myDB.objectStore1);
				var store2 = storeOfRW(db, myDB.objectStore2);
				store1.get(sendId).onsuccess = function (e) {
					var user_chat_list_data = e.target.result;
					user_chat_list_data.jieru = 0;
					user_chat_list_data.number = 1;
					leftList(user_chat_list_data, 'no');
					store1.put(user_chat_list_data);
					$($('.jieru_' + sendId)).remove();
				}
				var curTime = getNowFormatDate();
				var mes_data = {}
				res.数据.forEach(res_data => {
					mes_data = JSON.parse(res_data.消息内容);
					if (res_data.消息类型 == '图片') {
						if (typeof mes_data.message == 'string') {
							mes_data.message = JSON.parse(mes_data.message);
						}
					}
					mes_data.type = "会员";
					mes_data.receiveId = account + "_service"; //拼出当前客服id
					mes_data.getId = mes_data.sendId + "&" + mes_data.receiveId;
					mes_data.source = "left";
					mes_data.sendTime = curTime;
					mes_data.number = 1;
					store2.put(mes_data);
				});
				db.close();
			})
			jieru_user_list(num_ys);
			var newData = {};
			newData.type = '会员';
			newData.receiveId = sendId;
			newData.sendId = account + '_service';
			newData.message = "您好，我是客服" + nc + "很高兴为您服务,请问有什么可以为您效劳呢";
			newData.msgType = '文本';
			newData.pushData = "您好，我是客服" + nc + "很高兴为您服务,请问有什么可以为您效劳呢";
			newData.random = random;
			newData.msgIdFse = 111;
			newData.func = 'singleChat';
			var objString = JSON.stringify(newData);
			socket.emit('singleChat', objString, function (json) {
			})
		}
	})
}
//查看接入消息详情
function chakan(sendId) {
	var data = { 'userid': sendId, "services": account };
	$.ajax({
		type: "POST",
		url: ips + "/ajax.post?func=user_jieru_msg",
		data: $.param(data),
		success: function (res) {
			if (res.状态 != '成功') {
				alert(res.状态);
				if (res.状态 == "用户已被其他客服接入") {
					$($('.jieru_' + sendId)).remove();
				}
				return;
			}
			$('.jieru_msg').show();
			$('.jieru-msg-list').html('');
			$('.msg-btn').html('');
			var time = '';
			var index = 1;
			res.数据.forEach(res_data => {
				var da = JSON.parse(res_data.消息内容);
				if (index == 1) {
					time = res_data.录入时间;
					$('.jieru-msg-list').append('<div class="msg-time">' + res_data.录入时间 + '</div>');
				} else {
					if ((new Date(res_data.录入时间) - new Date(time)) / 1000 > 180) {
						time = res_data.录入时间;
						$('.jieru-msg-list').append('<div class="msg-time">' + res_data.录入时间 + '</div>');
					}
				}
				if (res_data.消息类型 == '文本') {
					$('.jieru-msg-list').append('<div class="msg-text"><span class="msg-icn"><img src="' + da.portrait + '" width="40px" height="40px"></span> <span class="msg-content">' + da.pushData + '</span></div>');
				} else if (res_data.消息类型 == '图片') {
					if (typeof da.message == 'string') {
						da.message = JSON.parse(da.message);
					}
					$('.jieru-msg-list').append('<div class="msg-text"><span class="msg-icn"><img src="' + da.portrait + '" width="40px" height="40px"></span> <span class="msg-content"><img src="' + da.message.url + '"></span></span></div>');
				}
				if (index == res.数据.length) {
					$('.msg-btn').append('<div class="msg-qx" onclick="qxfunc()">取消</div><div class="msg-hu" onclick="huifu(\'' + sendId + '\')">去回复</div>');
				}
				index++;
			})
		}
	})
}
function qxfunc() {
	$('.jieru-msg-list').html('');
	$('.msg-btn').html('');
	$('.jieru_msg').hide();
}
//下面是点击发送时,出现apped
$(".sendBtn").click(function () {
	var timestamp = Date.parse(new Date());
	var name = "i" + timestamp;
	sendmess(name);
})

function sendmess(name) {
	var conts = $(".editor_message").text().replace(/'/g, "‘");
	var parten = /^\s*$/;
	var curTimes = getNowFormatDate();
	var lights = $(".lights").attr('id');
	if (!lights) {
		alert("请选择联系人")
		return false;
	}
	if (parten.test(conts)) {
		return false;
	} else {
		$(".show_bb").append('<li class="bb_rightbox"><img class="bb_rightimg" src="images/kefu.png"><div class="bb_rightwrap" style="position: relative"><i class="fa fa-spin fa-refresh ' + name + '" style="position: absolute;left: -35px;top: 20px;"></i><p class="bb_content">' + conts + '</p><span></span></div></li>')
		$(".editor_message").empty();
		$('.show_bb').scrollTop($('.show_bb')[0].scrollHeight);

		var className = "." + name;
	}
	var newData = {};
	var data = {};
	if (lights.indexOf("_") > 0) {
		dataType = lights.split('_')[1];
		if (dataType == 'service') {
			data.type = '客服';
			newData.type = '客服';
		} else {
			data.type = dataType;
			newData.type = dataType;
		}
		newData.receiveId = lights;
	} else {
		data.type = "会员";
		newData.type = '会员';
		newData.receiveId = lights;
	}

	//	if(lights.substr(lights.length - 8) == "_service") { 
	//		newData.type = '客服';
	//		data.type = '客服';
	//	} else {
	//		newData.type = '会员';
	//		data.type = '会员';
	//	}

	//	newData.receiveId = lights.replace("_service", "");
	newData.sendId = account + '_service';
	newData.message = conts;
	newData.msgType = '文本';
	newData.pushData = conts;
	newData.random = random;
	newData.msgIdFse = 111;
	newData.func = 'singleChat';
	//本地数据库
	data.receiveId = $(".lights").attr('id');
	data.sendId = account + '_service';
	data.content = conts;
	data.msgType = '文本';
	data.sendCode = random;
	data.msgIdFse = 111;
	data.发送状态 = "进行中";
	data.source = "right";
	data.getId = data.receiveId + "&" + data.sendId;
	data.sendTime = curTimes;

	var sId = data.receiveId;
	if (sId.indexOf("_") > 0) {
		dataType = sId.split('_')[1];
		if (dataType == 'service') {
			data.type = '客服';
		} else {
			data.type = dataType;
		}
	} else {
		data.type = "会员";
	}


	var objString = JSON.stringify(newData);
	console.log(objString)
	setTimeout(function () {
		if ($(className)) {
			console.log('11111')
			$(className).toggleClass("fa-spin fa-refresh fa-exclamation");
			$(className).css("color", "red");
		}
	}, 3000)
	socket.emit('singleChat', objString, function (json) {
		console.log(json)
		if (conts == '会话结束,感谢您的来访!!!') {
			gdss(gb_account);
		}
		if (json.msg != "发送成功") {
			if (json.msg == '用户已经断开连接') {
				alert('用户连接已断开')
				return;
			} else {
				data.发送状态 = "发送失败";
				$(className).toggleClass("fa-spin fa-refresh fa-exclamation");
				$(className).css("color", "red");
			}
		} else {
			$(className).remove();
			// $(className).toggleClass("fa-spin fa-refresh fa-exclamation");
			// $(className).css("color","red");
			data.发送状态 = "发送成功";
			//				console.log(data);s
		}

		//		{"type":"客服","receiveId":"456_service","sendId":"67_service","message":"123232",
		//		"msgType":"文本",
		//		"random":"30cae5db-e7c8-4c38-bf9d-9f3eac070dd2","msgIdFse":111,"func":"singleChat"}
		//		
		openDB(myDB.dbName, myDB.version, function (db) {
			if (data.type == "客服") {
				var store2 = storeOfRW(db, myDB.objectStore4);
			} else {
				var store2 = storeOfRW(db, myDB.objectStore2);
			}
			store2.put(data);
		});

	})
}

//亲!下面是发送图片的

function sendpic(d, name) {
	//	console.log('111111111111')
	//	var conts = $(".editor_message").text().replace(/'/g,"‘");
	//	var parten = /^\s*$/;
	var curTimes = getNowFormatDate();
	var lights = $(".lights").attr('id');
	//	if(parten.test(conts)) {
	//		return false;
	//	} else {
	//		$(".show_bb").append('<li class="bb_rightbox"><img class="bb_rightimg" src="images/kefu.png"><div class="bb_rightwrap"><p class="bb_content">123</p><i></i></div></li>')
	//		$('.show_bb').scrollTop($('.show_bb')[0].scrollHeight);
	//	}

	var className = "." + name;
	var idName = "#" + name;
	var newData = {};
	var data = {};
	//	if(lights.substr(lights.length - 8) == "_service") { 
	//		newData.type = '客服';
	//		data.type = '客服';
	//	} else {
	//		newData.type = '会员';
	//		data.type = '会员';
	//	}
	//  	var sId = data.receiveId;
	if (lights.indexOf("_") > 0) {
		dataType = lights.split('_')[1];
		if (dataType == 'service') {
			data.type = '客服';
			newData.type = '客服';
		} else {
			data.type = dataType;
			newData.type = dataType;
		}
		newData.receiveId = lights;
	} else {
		data.type = "会员";
		newData.type = '会员';
		newData.receiveId = lights;
	}
	//      console.log(data);
	var contents = {};
	//	contents.img='';
	contents.url = d;
	contents.extra = '';
	var bbdata = {};
	//var abcd='http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017072214195253667.png';
	bbdata.url = contents.url;

	//	下面是调用接口
	$.ajax({
		type: "POST",
		url: ips + "/ajax.post?func=changeImg",
		data: bbdata,
		success: function (json) {
			if (json.状态 == '成功') {
				//                console.log('json+++++++++++++++++++++++')
				//				console.log(json);

				var img = json.burl;
				var image = new Image();
				image.src = img;
				image.onload = function () {
					var base64 = json.img_data;
					var ttt = base64;
					//				    console.log(typeof base64);
					var ttc = ttt.split('data:image/png;base64,')[1];


					contents.img = ttt.split(',')[1];

					//	newData.receiveId = lights.replace("_service", "");
					newData.sendId = account + "_service";
					newData.message = JSON.stringify(contents);
					newData.msgType = '图片';
					newData.pushData = '[图片]';
					newData.random = random;
					newData.msgIdFse = 111;

					contents.img = base64;
					data.receiveId = $(".lights").attr('id');
					data.sendId = account + '_service';
					data.content = JSON.stringify(contents);
					data.msgType = '图片';
					data.sendCode = random;
					data.msgIdFse = 111;
					data.发送状态 = "进行中";
					data.source = "right";
					data.getId = data.receiveId + "&" + data.sendId;
					data.sendTime = curTimes;

					console.log(newData)

					var objString = JSON.stringify(newData);
					console.log(objString)
					setTimeout(function () {
						if ($(className)) {
							console.log('11111')
							$(className).toggleClass("fa-spin fa-refresh fa-exclamation");
							$(className).css("color", "red");
						}
					}, 3000)
					socket.emit('singleChat', objString, function (json) {
						console.log(json)
						if (json.msg != "发送成功") {
							data.发送状态 = "发送失败";
							$(className).toggleClass("fa-spin fa-refresh fa-exclamation");
							$(className).css("color", "red");
							alert(data.发送状态);
							return;
						} else {
							$(className).remove();
							// $(className).toggleClass("fa-spin fa-refresh fa-exclamation");
							// $(className).css("color","red");
							$(idName).attr("src", contents.url);
							data.发送状态 = "发送成功";
							// $(".show_bb").append('<li class="bb_rightbox"><img class="bb_rightimg" src="images/kefu.png"><div class="bb_rightwraps"><img src="'+contents.url+'" style="max-width:576px"/></div></li>')
							//
						}
						openDB(myDB.dbName, myDB.version, function (db) {
							if (data.type == "客服") {
								var store2 = storeOfRW(db, myDB.objectStore4);
							} else {
								var store2 = storeOfRW(db, myDB.objectStore2);
							}
							store2.put(data);
						});
					})

				}

			}

		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			if (XMLHttpRequest.status != 408) {
				$(className).toggleClass("fa-spin fa-refresh fa-exclamation");
				$(className).css("color", "red");
			}
		}
	});

}


function messageRecord(a, searchkey) {
	$('.right_side').show();
	$('.right_box').show();
	$('.data_view').hide();
	$('li.list_item').removeClass('lights');
	//  $('.'+a).siblings().removeClass('lights');
	$('.' + a).addClass('lights');
	//	var bbc = $('.' + a).find('.names').text();
	//	console.log($('.' + a).find('.names'))
	var bbc;
	var btt = $('.' + a).find('.names');
	if (btt.length > 1) {
		bbc = $(btt[1]).text();
	} else {
		bbc = $('.' + a).find('.names').text();
	}

	//	console.log($(btt[1]).text());

	//	console.log(bbc);
	//	console.log('bbbbbbbbbbbbccccccccccccccccccccccccc')
	var tpic = $('.' + a).find('img').attr('src');
	$('.top_bar ').find('.img_show').attr('src', tpic);
	$('.top_bar ').find('.name_show').text(bbc);
	$('.' + a).find('.message_num').remove();
	$('.show_bb').remove();
	$('.items_a').append('<ul class="show_bb" id="' + a + '"></ul>');

	// 	此处需要调用本地数据库,从数据库中拿到聊天数据
	var send_account = a.substring(10, a.length);

	var oid = send_account + '&' + account + '_service';
	//	console.log(oid)
	//	console.log(searchkey)
	var myDB = {};
	myDB.dbName = 'chat';
	//	console.log(oid);
	var dataType = a.substring(a.length - 8);
	//	console.log(dataType);
	//	console.log('wwwwwwwwwwwwwwwwwwwwwwwwwwwwwww');
	var sendId = a.substring(10, a.length);
	var myurl;
	//	console.log(dataType)
	if (dataType == '_service') {
		//	var oid =send_account +'&'+account+'_service';
		myDB.objectStore1 = 'service_chat_content';
		myDB.objectStore2 = 'service_chat_list';
		myurl = 'images/team-18.png';
		//	console.log(oid);

	} else {
		//	var oid =send_account +'&'+account;
		myDB.objectStore1 = 'user_chat_content';
		myDB.objectStore2 = 'user_chat_list';
	}
	if ($('.list_item .message_num').length <= 0) {
		$('.record_list .message_num1').remove();
	}
	openDB(myDB.dbName, myDB.version, function (db) {
		//		console.log(oid);
		var store1 = storeOfRW(db, myDB.objectStore2);
		store1.get(sendId).onsuccess = function (e) {
			var user_chat_list_data = e.target.result;
			var data = user_chat_list_data
			if (user_chat_list_data) {
				data.number = 0;
			};
			if (data) {
				store1.put(data);
			}
		}
		db.close();
	})
	openDB(myDB.dbName, myDB.version, function (db) {
		//console.log(searchkey)
		chatListPage1(db, myDB.objectStore1, 'getIndex', IDBKeyRange.only(oid), 1, 10, 'next', searchkey);
		db.close();
	})

	function chatListPage1(db, storeName, index, dataRange, start, end, ord, searchkey) {
		// console.log('111111111111111111')
		//		console.log(searchkey);
		if (searchkey == undefined || searchkey == null || searchkey == '') {
			searchkey = '';
		}
		//		console.log(searchkey)
		var store = storeOfRW(db, storeName);
		var now = '0';
		store.index(index).openCursor(dataRange, ord).onsuccess = function (e) {
			var cursor = e.target.result;
			i++;
			if (cursor) {
				//以全局去控制条数
				// consolelog('ahahahah');
				// console.log(cursor.value)
				var left_conts = cursor.value;
				//				 console.log(left_conts)
				// console.log(left_conts.source);
				var a = '#list_item_' + left_conts.sendId;

				if (left_conts.source == 'left') {

					if (left_conts.pushData.indexOf(searchkey) != -1) {
						//						 console.log(left_conts.pushData);

						//					如果是客服.写死,不是就
						if (dataType != '_service') {
							myurl = left_conts.portrait;
						}
						var Time_minus = minusDateStamp(now, left_conts.sendTime);
						//					30*60*1000
						var data_show;
						var leftContent;
						if (left_conts.msgType == '图片') {
							// 	data_show = left_conts.message.url;
							// 	<img src="'+pic_message.url+'" style="top:-32px"/>
							data_show = '<div class="bb_leftwraps"><img class="pics_on" src="' + left_conts.message.url + '" style="max-width:576px"/></div>'

						} else if (left_conts.msgType == '文本') {
							// 	data_show =left_conts.pushData;
							// 	<p class="bb_content">' + left_conts.pushData + '</p><i></i>
							data_show = '<div class="bb_leftwrap"><p class="bb_content">' + left_conts.pushData + '</p><span></span></div>'
						}
						if (Time_minus >= 5 * 60 * 1000) {
							//						console.log('相隔时间大于30分钟');

							//						$('.show_bb').append('<li class="showTime">'+left_conts.sendTime+'</li><li class="bb_leftbox"><img class="bb_leftimg" src="'+myurl+'" width="40px" height="40px"><div class="bb_leftwrap"><p class="bb_content">' + left_conts.pushData + '</p><i></i></div></li>')
							$('.show_bb').append('<li class="showTime">' + left_conts.sendTime + '</li><li class="bb_leftbox"><img class="bb_leftimg" src="' + myurl + '" width="40px" height="40px" >' + data_show + '</li>')

						} else {
							//						console.log('相隔时间小于30分钟');
							//						console.log(left_conts.message.url);
							//						$('.show_bb').append('<li class="bb_leftbox"><img class="bb_leftimg" src="'+myurl+'" width="40px" height="40px"><div class="bb_leftwrap"><p class="bb_content">' + left_conts.pushData + '</p><i></i></div></li>')
							$('.show_bb').append('<li class="bb_leftbox"><img class="bb_leftimg" src="' + myurl + '" width="40px" height="40px" >' + data_show + '</li>')
						}
						//					$('.show_bb').append('<li class="showTime">'+left_conts.sendTime+'</li><li class="bb_leftbox"><img class="bb_leftimg" src="'+myurl+'" width="40px" height="40px"><div class="bb_leftwrap"><p class="bb_content">' + left_conts.pushData + '</p><i></i></div></li>')
						$('.show_bb').scrollTop($('.show_bb')[0].scrollHeight);
					}
				} else {

					if (left_conts.content.indexOf(searchkey) != -1) {
						//					 	 console.log(left_conts.content);
						var Time_minus = minusDateStamp(now, left_conts.sendTime);
						//					console.log(Time_minus);
						if (left_conts.msgType == '图片') {
							var cton = JSON.parse(left_conts.content);
							leftContent = '<div class="bb_rightwraps"><img src="' + cton.url + '"  style="max-width:576px"/></div>'
						} else {
							leftContent = '<div class="bb_rightwrap"><p class="bb_content">' + left_conts.content + '</p><span></span></div>'
						}
						if (Time_minus >= 5 * 60 * 1000) {
							//						console.log('相隔时间大于30分钟');
							$('.show_bb').append('<li class="showTime">' + left_conts.sendTime + '</li><li class="bb_rightbox"><img class="bb_rightimg" src="images/kefu.png">' + leftContent + '</li>')
						} else {
							//						console.log('相隔时间小于30分钟');
							$('.show_bb').append('<li class="bb_rightbox"><img class="bb_rightimg" src="images/kefu.png">' + leftContent + '</li>')
						}
						$('.show_bb').scrollTop($('.show_bb')[0].scrollHeight);
					}
				}

				//				alert(now+'1');
				now = left_conts.sendTime;
				//				alert(now);
				cursor.continue();
			}
		};

	}

}
$(".num-left").click(function () {
	var num = $("#jieru_number .number-dq").text();
	if (Number(num) - 1 <= 0) {
		return;
	}
	jieru_user_list(Number(num) - 1);
})
$(".num-right").click(function () {
	var num = $("#jieru_number .number-dq").text();
	var max_num = $("#jieru_number .number-max").text();
	if (Number(num) + 1 > Number(max_num)) {
		return;
	}
	jieru_user_list(Number(num) + 1);
})
function jieru_user_list(num) {
	//下面是对接时直接从本地数据库上获取
	var myDB = {
		dbName: 'chat',
		version: 1,
		objectStore1: 'user_chat_list',
		objectStore2: 'service_chat_list',
		reid: account + "_service" //拼出当前客服id
	};
	var data = { "页数": !num || num <= 0 ? 1 : num, "services": account };
	$.ajax({
		type: "POST",
		url: ips + "/ajax.post?func=jieru_user_list",
		data: $.param(data),
		success: function (res) {
			if (res.状态 != '成功') {
				alert(res.状态);
				return;
			}
			if (res.数据.length == 0 && num) {
				return;
			}
			$("#jieru_number .num-context").html('');
			//生成分页按钮块
			$("#jieru_number .number-dq").text(res.页数);
			$("#jieru_number .number-max").text(res.总页数);
			for (var ssss = 1; ssss <= res.总页数; ssss++) {
				//最多显示6页按钮
				if (res.页数 <= 6) {
					if (res.页数 == ssss) {
						$("#jieru_number .num-context").append('<span class="jieru-lisi-num" onclick="jieru_user_list(\'' + ssss + '\')">' + ssss + '</span>');
					} else {
						$("#jieru_number .num-context").append('<span onclick="jieru_user_list(\'' + ssss + '\')">' + ssss + '</span>');
					}
				} else {
					ssss = 6 * parseInt((Number(res.页数) / 6)) + 1;
					if (res.页数 == ssss) {
						$("#jieru_number .num-context").append('<span class="jieru-lisi-num" onclick="jieru_user_list(\'' + ssss + '\')">' + ssss + '</span>');
					} else {
						$("#jieru_number .num-context").append('<span onclick="jieru_user_list(\'' + ssss + '\')">' + ssss + '</span>');
					}
				}

			}
			while ($("#jieru_list .jieru").length > 0) {
				$("#jieru_list .jieru").remove();
			}

			openDB(myDB.dbName, myDB.version, function (db) {
				var store1 = storeOfRW(db, 'user_chat_list');
				var mm = 0;
				var m_s = false;
				var nn = 0;
				var n_s = false;
				if(res.数据.length == 0 && res.数据s.length == 0){
					if(socket == 1){//第一次进入页面的时候
						socket_msg();//开启socket监听
					}
					
				}else{
					if(res.数据.length == 0){
						m_s = true;
					}else if(res.数据s.length == 0){
						n_s = true;
					}
					res.数据.forEach(res_d => {
						mm++;
						var res_data = JSON.parse(res_d.消息内容);
						store1.get(res_data.sendId).onsuccess = function (e) {
							var user_chat_list_data = e.target.result;
							if (!user_chat_list_data) {
								res_data.type = "会员";
								res_data.jieru = 1;
								res_data.receiveId = account + "_service"; //拼出当前客服id
								res_data.getId = res_data.sendId + "&" + res_data.receiveId;
								res_data.source = "left";
								var curTime = getNowFormatDate();
								res_data.sendTime = curTime;
								res_data.number = 1;
								rightList(res_data);
								store1.put(res_data);
							} else {
								rightList(user_chat_list_data);
							}
						}
						if (mm >= res.数据.length) {
							m_s = true;
							if (m_s && n_s) {
								db.close();
								if(socket == 1){//第一次进入页面的时候
									socket_msg();//开启socket监听
								}
							}
						}
					});
					res.数据s.forEach(res_d => {
						nn++;
						var res_data = JSON.parse(res_d.消息内容);
						store1.get(res_data.sendId).onsuccess = function (e) {
							var user_chat_list_data = e.target.result;
							if (!user_chat_list_data) {
								res_data.type = "会员";
								res_data.jieru = 0;
								res_data.receiveId = account + "_service"; //拼出当前客服id
								res_data.getId = res_data.sendId + "&" + res_data.receiveId;
								res_data.source = "left";
								var curTime = getNowFormatDate();
								res_data.sendTime = curTime;
								res_data.number = 1;
								leftList(res_data, 'no');
								store1.put(res_data);
							}
						}
						if (nn >= res.数据s.length) {
							n_s = true;
							if (m_s && n_s) {
								db.close();
								if(socket == 1){//第一次进入页面的时候
									socket_msg();//开启socket监听
								}
							}
						}
					});
				}
				
			})
		}
	});
}


$(function () {

	//下面是对接时直接从本地数据库上获取
	var myDB = {
		dbName: 'chat',
		version: 1,
		objectStore1: 'user_chat_list',
		objectStore2: 'service_chat_list',
		reid: account + "_service" //拼出当前客服id
	};

	openDB(myDB.dbName, myDB.version, function (db) {
		var store1 = storeOfRW(db, 'user_chat_list');
		store1.openCursor().onsuccess = function (event) {
			var cursor = event.target.result;
			if (cursor) {
				//  alert("Name for SSN " + cursor.key + " is " + cursor.value.name);
				var result1 = cursor.value;
				//已被接入的客服加载进对话列表
				store1.delete(cursor.key);//如果是已结束 或者未接入情况  全部清除
				cursor.continue();
			} else {
				//  alert("No more entries!");
				db.close();
				jieru_user_list();
			}
		};
	})

	openDB(myDB.dbName, myDB.version, function (db) {
		//  console.log('-----------------------')
		//      chatListPage1(db,'user_chat_list','getIndex',IDBKeyRange.only(oid),1,10,'next');
		var store2 = storeOfRW(db, 'service_chat_list');
		store2.openCursor().onsuccess = function (event) {
			var cursor = event.target.result;
			if (cursor) {
				var result = cursor.value;
				key = result.sendId;
				if (result.receiveId == myDB.reid) {
					if (result.number == 0) {
						$("#message_list").append('<li class="list_item list_item_' + key + '" id =' + key + ' onclick="messageRecord(\'list_item_' + key + '\',searchkey)"><img src="images/team-18.png" width="40px" height="40px"> <span class="sp_user names">客服-' + result.sendName + '</span> <span class="sp_content">' + result.pushData + '</span> <span class="sp_sendtime">' + result.sendTime + '</span></li>')
					} else {
						$("#message_list").append('<li class="list_item list_item_' + key + '" id =' + key + ' onclick="messageRecord(\'list_item_' + key + '\',searchkey)"><img src="images/team-18.png" width="40px" height="40px"> <span class="sp_user names">客服-' + result.sendName + '</span> <span class="sp_content">' + result.pushData + '</span> <span class="sp_sendtime">' + result.sendTime + '</span> <span class ="message_num" id="link' + result.sendName + '">' + result.number + '</span></li>')
					}
				}
				cursor.continue();
			} else {
				db.close()
			}
		};
	})

})



//快捷键发送消息
$('.editor_message').keydown(function (e) {
	var conts = $(".editor_message").text();
	if (e.keyCode == 13 && conts != "" && conts != null) {
		sendmess();
	}
});

//获取当前时间
function getNowFormatDate() {
	var date = new Date();
	var seperator1 = "-";
	var seperator2 = ":";
	var month = date.getMonth() + 1;
	var strDate = date.getDate();
	if (month >= 1 && month <= 9) {
		month = "0" + month;
	}
	if (strDate >= 0 && strDate <= 9) {
		strDate = "0" + strDate;
	}
	var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate +
		" " + date.getHours() + seperator2 + date.getMinutes() +
		seperator2 + date.getSeconds();
	return currentdate;
}

//时间戳
//					function getDateTimeStamp(dateStr){
// return Date.parse(new Date(dateStr));
//}
//
//取时间戳差
function minusDateStamp(preTime, curTime) {
	var minust = Date.parse(new Date(curTime)) - Date.parse(new Date(preTime))
	return minust;
}

function getBase64Image(img) {
	var canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	var ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0, img.width, img.height);
	var ext = img.src.substring(img.src.length - 3).toLowerCase();
	var dataURL = canvas.toDataURL("image/" + ext);
	return dataURL;
}

$('.chax').click(function () {
	var data = {};
	data.账号 = account;
	data.sender = $('.link_account').val();
	data.receiveName = $('.kefu_img_sp').text();
	console.log(data);

	$.ajax({
		type: "POST",
		url: ips + "/ajax.post?func=search_chat",
		dataType: "json",
		data: data,
		success: function (result) {
			if (result.状态 != '成功') {
				alert(result.状态);
			} else {

			}
		}
	});
})


function socket_msg() {
	myDB = {
		dbName: 'chat',
		version: 1,
		objectStore1: 'user_chat_list',
		objectStore2: 'user_chat_content',
		objectStore3: 'service_chat_list',
		objectStore4: 'service_chat_content'
	};

	socket = io.connect('http://120.79.224.38:9988', { "transports": ['websocket'] });
	// socket = io.connect('http://127.0.0.1:9988', { "transports": ['websocket'] });
	//socket = require('socket.io-client')(ips,{"transports":['websocket']});
	//拿到uuid

	//加了点事件哦
	socket.on('connect', () => {
		//alert('连接成功...');
		if (!account) {
			alert('登录已失效,请重新登录');
			return;
		}
		var data = {};
		data.userid = account + '_service';
		data.random = random;
		data.socketuuid = socketuuid;
		socket.emit('auth', JSON.stringify(data), function (ack) {
			console.log('ack', ack);
			if (ack.code == 1) {
				console.log("认证成功");
			} else {
				alert(ack.msg);
			}
		})
	});

	socket.on('connectionResult', function (sss) {

		if (sss) {
			//alert('获取uuid成功！uuid === '+sss)
			socketuuid = sss;
		}
	});


	setInterval(function () {
		console.log('==============定时==============');
		socket.emit('time', '', function (a) {
			console.log('==============定时==============');
			console.log(a)
		});
	}, 30000);

	//用户已被接收提醒
	socket.on('jieru_user_msg', function (data) {
		if (typeof data == 'string') {
			data = JSON.parse(data);
		}
		if (data.userid) {
			if ($("#jieru_list .jieru_" + data.userid).length > 0) {
				$("#jieru_list .jieru_" + data.userid).remove();
				var num_ys = $("#jieru_number .number-dq").text();
				jieru_user_list(num_ys);
			}
		}
	})

	//用户断开连接
	socket.on('user_break', function (data) {
		if (typeof data == 'string') {
			data = JSON.parse(data);
		}
		if (data.userid) {
			if ($('.list_item_' + data.userid).length > 0) {
				if($('.list_item_' + data.userid).is('.lights')){
					//删除中间内容
					$('.top_bar ').find('.img_show').attr('src', 'images/team-18.png');   //清空联系人图标
					$('.top_bar ').find('.name_show').text("");                          //清空联系人昵称
					$('.show_bb').remove();    
				}
				$('.list_item_' + data.userid).remove();
				openDB(myDB.dbName, myDB.version, function (db) {
					if (data.userid) {
						var store1 = storeOfRW(db, myDB.objectStore1);
						store1.delete(data.userid);
					}
				});
			}
		}
	})

	//收消息
	socket.on('message', function (data, ack) {
		console.log('==========message============');
		//console.log(data)
		if (typeof data == 'string') {
			console.log('=============data是字符串，需要转的================');
			data = JSON.parse(data);

			console.log(data)
		}
		if (typeof data.message == 'string') {
			console.log('=============图片是字符串，需要转的================');
			data.message = JSON.parse(data.message);
			console.log(data.message)
		}
		// console.log(data.message.url)
		$("#xiaoxi").val(data.pushData);
		ack(data.msgId);

		var curTime = getNowFormatDate();

		var sId = data.sendId;
		if (sId.indexOf("_") > 0) {
			dataType = sId.split('_')[1];
			if (dataType == 'service') {
				data.type = '客服';
			} else {
				data.type = dataType;
			}
		} else {
			data.type = "会员";
		}

		openDB(myDB.dbName, myDB.version, function (db) {
			//判断发送者是  客服/会员
			// if(data.sendId.substr(data.sendId.length-8) == "_service"){
			if (data.type == "客服") {
				var store1 = storeOfRW(db, myDB.objectStore3);
				var store2 = storeOfRW(db, myDB.objectStore4);
			} else {
				var store1 = storeOfRW(db, myDB.objectStore1);
				var store2 = storeOfRW(db, myDB.objectStore2);
			}

			// 标记客服是否接入 接入0  未接入1  
			data.jieru = 0;

			//如果发送者是会员的话  查询是否该会员已被此客服接入

			//删
			//store1.delete('5');
			//增和改
			// store1.put({sendId:data.sendId,name:"用户3",age:26,account:'9',sendTime:'2017-06-04 17:22:30'});
			// 组 获取id （发送者id+接收者id）
			data.receiveId = account + "_service";
			data.getId = data.sendId + "&" + data.receiveId;
			// 标记渲染时消息的位置   左/右
			data.source = "left";
			data.sendTime = curTime;


			var curlist = '.list_item_' + data.sendId;
			var myUrl = 'images/team-18.png';
			if ($('.list_item_' + data.sendId).is('.lights')) {
				if (data.sendId.substr(data.sendId.length - 8) != "_service") {
					myUrl = data.portrait;
				}
				if (data.msgType == '图片') {
					console.log('===图片===');
					console.log(data.message.url);
					if (typeof data.message == 'string') {
						data.message = JSON.parse(data.message);
					}

					$(".show_bb").append('<li class="bb_leftbox"><img class="bb_leftimg" src="' + myUrl + '" width="40px" height="40px"><div class="bb_leftwraps"><img class="pics_on" src="' + data.message.url + '" style="top:-32px"/></div></li>');
				} else if (data.msgType == '文本') {
					if (data.zdhf && data.zdhf == '1') {
						$(".show_bb").append('<li class="bb_rightbox"><img class="bb_rightimg" src="images/kefu.png"><div class="bb_rightwrap" style="position: relative"><p class="bb_content">' + data.pushData + '</p><span></span></div></li>')
					} else {
						$(".show_bb").append('<li class="bb_leftbox"><img class="bb_leftimg" src="' + myUrl + '" width="40px" height="40px"><div class="bb_leftwrap"><p class="bb_content">' + data.pushData + '</p><span></span></div></li>');
					}
				}
				$('.show_bb').scrollTop($('.show_bb')[0].scrollHeight);
				data.number = 0;
				if (data.zdhf && data.zdhf == '1') {

				} else {
					store1.put(data);
				}

				$('.message_list .list_item_' + data.sendId).find('.sp_content').text(data.pushData);
				$('.message_list .list_item_' + data.sendId).find('.sp_sendtime').text(data.sendTime);

				//          store2.put(data);	
			} else {
				//			console.log(data.sendId);
				store1.get(data.sendId).onsuccess = function (e) {
					var user_chat_list_data = e.target.result;
					if (user_chat_list_data) {
						data.number = user_chat_list_data.number + 1;
						if (user_chat_list_data.jieru == 1) {//如果不是第一次发起接入请求  或者未接入状态
							data.jieru = 1;
							rightList(data);
						} else {
							leftList(data);
							if ($('.record_list .message_num1').length <= 0) {
								$('.record_list').append('<span class ="message_num1"></span>');
							}
						}
					} else {
						data.number = 1;
						if (data.type == '会员') {
							data.jieru = 1;
							rightList(data);
						} else {
							leftList(data);
							if ($('.record_list .message_num1').length <= 0) {
								$('.record_list').append('<span class ="message_num1"></span>');
							}
						}
					}
					store1.put(data);
				};
			}

			//判断用户是否接入 接入则存入本地数据存储
			store1.get(data.sendId).onsuccess = function (e) {
				var user_chat_list_data = e.target.result;
				if ((!user_chat_list_data && data.type != '会员') || (user_chat_list_data && user_chat_list_data.jieru == 0)) {
					if (data.type == "客服") {
						store2 = storeOfRW(db, myDB.objectStore4);
					} else {
						store2 = storeOfRW(db, myDB.objectStore2);
					}
					if (data.zdhf && data.zdhf == '1') {
						let datam = {};
						datam.receiveId = data.sendId;
						datam.sendId = data.receiveId;
						datam.content = data.pushData;
						datam.msgType = '文本';
						datam.sendCode = data.msgId;
						datam.msgIdFse = 111;
						datam.发送状态 = "发送成功";
						datam.source = "right";
						datam.getId = datam.receiveId + "&" + datam.sendId;
						datam.sendTime = data.sendTime;
						var sId = datam.receiveId;
						if (sId.indexOf("_") > 0) {
							dataType = sId.split('_')[1];
							if (dataType == 'service') {
								datam.type = '客服';
							} else {
								datam.type = dataType;
							}
						} else {
							datam.type = "会员";
						}
						store2.put(datam);
					} else {
						// console.log(data);
						store2.put(data);
					}
				}
				db.close();
			}
			//分页
			//chatListPage(db,myDB.objectStore1,'accountIndex',null,1,6,'next');

		});
		//  box(data);
		//收到消息时,进行判断当前打开的聊天界面是否为sendid界面,如果是,就直接append;否则,在左侧+1;
	});
}