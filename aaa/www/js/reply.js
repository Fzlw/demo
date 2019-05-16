/**
 * Created by he on 2017/7/14.
 */
$(function() {
	var data = {};
	data.账号 = account;
	data.随机码 = random;
	data.行为 = "查询";
	$.ajax({
		type: "POST",
		url: ips + "/ajax.post?func=reply",
		data: data,
		success: function(result) {
			//alert(result.状态);
			if(result.状态 != "成功") {
				// alert(json.状态);
			} else {
				result.系统.forEach(function(name) {
					var li = '<li>' +
						'<span></span>' +
						'<div class="system_content" style="width: 85%">' + name.快捷回复内容 + '</div>' +
						'</li>';
					$(".system-list").append(li);
				});
				$(".system_content").click(function() {
					var ttc = $(this).text();
					$('#reply_content').hide();
					$(".editor_message").text(ttc);
					sendmess();
				});

				result.自定义.forEach(function(name) {
					var li = '<li class="li_' + name.id + '" onclick="">' +
						'<span></span>' +
						'<div class="content_' + name.id + '" send = "1">' + name.快捷回复内容 + '</div>' +
						'<ul class="operation operation_' + name.id + '" style="display: none;">' +
						'<li class="save_' + name.id + '" style="display: none;"><img src="images/reply4.png" alt=""></li>' +
						'<li class="editor_' + name.id + '"><img src="images/reply2.png" alt=""></li>' +
						'<li class="delete_' + name.id + '"><img src="images/reply3.png" alt=""></li>' +
						'</ul>' +
						'</li>';
					$(".custom-list").append(li);
					behavior(name.id); //给按钮添加   增删改查   操作

				})
			}
		}
	});
});

//给按钮添加   增删改查   操作
function behavior(onlyId) {
	var save = ".save_" + onlyId;
	var editor = ".editor_" + onlyId;
	var del = ".delete_" + onlyId;
	var nowLi = ".li_" + onlyId;
	var nowDiv = ".content_" + onlyId;
	var con = false;
	var data = {};
	data.账号 = account;
	data.随机码 = random;
	//给当前div添加   点击发送消息事件
	$(nowDiv).click(function() {
		if($(this).attr("send") == 1) {
			var ttc = $(this).text();
			$('#reply_content').hide();
			$(".editor_message").text(ttc);
			sendmess();
		}
	});

	//鼠标 经过 离开 当前li时  显示隐藏按钮
	$(nowLi).mouseenter(function() {
		$(this).children("ul").show();

	});

	$(nowLi).mouseleave(function() {
		$(this).children("ul").hide();
	});

	//保存按钮
	$(save).click(function() {
		var nowDiv = $(this).parent().prev();

		data.快捷回复内容 = nowDiv.text();
		if(data.快捷回复内容 == "") {
			alert("内容不能为空");
			return;
		}
		nowDiv.attr("send", "1");
		nowDiv.removeAttr("contenteditable");
		nowDiv.removeClass("inBorder");

		if(nowDiv.attr("addDIV") == 1) { //sql添加操作
			// console.log("添加+++++++++++++++++");
			data.行为 = "添加";
			data.类别 = "自定义";

		} else { //sql修改操作
			// console.log("修改+++++++++++++++++");
			data.行为 = "修改";
			data.id = $(this).parent().parent().attr("class").replace("li_", "");
			// console.log(data.id);
		}
		console.log(data);

		$.ajax({
			type: "POST",
			url: ips + "/ajax.post?func=reply",
			data: data,
			success: function(result) {
				console.log(result);
				if(result.状态 != "成功") {
					alert(result.状态);
				} else {
					//保存 编辑按钮切换
					$(editor).show();
					$(save).hide();

					if(result.id) { //添加标识   以便删除
						nowDiv.removeAttr("addDIV");
						var newLi = "li_" + result.id;
						$(nowLi).removeClass(nowLi.replace(".", "")).addClass(newLi);
						$(del).click(function() { //可以获取id    添加另一半删除事件
							if(con) {
								var data = {};
								data.账号 = account;
								data.随机码 = random;
								data.行为 = "删除";
								data.id = result.id;
								// console.log(data);
								$.ajax({
									type: "POST",
									url: ips + "/ajax.post?func=reply",
									data: data,
									success: function(result) {
										alert(result.状态);
									}
								})
							}
						});
						//
					}
				}
				//else结束
			}
		})

	});

	//编辑按钮
	$(editor).click(function() {
		var nowDiv = $(this).parent().prev();
		nowDiv.attr("contenteditable", "true");
		nowDiv.addClass("inBorder");
		nowDiv.attr("send", "0");
		//保存 编辑按钮切换
		$(editor).hide();
		$(save).show();
	});

	if(onlyId.indexOf("add") == -1) { //快捷语不是新加的
		$(del).click(function() { //有sql  唯一id   直接添加删除事件
			var haveCon = confirm("您确定要删除吗？")
			var _this = $(this);
			if(haveCon) {
				data.行为 = "删除";
				data.id = onlyId;
				$.ajax({
					type: "POST",
					url: ips + "/ajax.post?func=reply",
					data: data,
					success: function(result) {
						alert(result.状态);
						_this.parent().parent().remove();
					}
				})
			}
		})
	} else { //快捷语是新增的
		$(del).click(function() { //添加部分删除事件   在保存事件里添加另一半
			con = confirm("您确定要删除吗？");
			if(con) {
				$(this).parent().parent().remove();
			}
		})

	}

}

//快捷语/表情   切换   内容发送
$('.fast_reply').click(function() {
	$('#emojis').hide();
	$('#reply_content').toggle();
})
$('.biaoq').click(function() {
	$('#reply_content').hide();
	$('#emojis').toggle();
});

emoji_face();

function emoji_face() {
	$('#main_emojis .face').click(function() {
		facet = $(this).text();
		var con = $(".editor_message").text();
		$(".editor_message").text(con + facet);
		$('#emojis').hide();
	})
}

$('#emojis ul li').click(function() {
	var ttc = $(this).text();
	$('#reply_content').hide();
	$(".editor_message").text(ttc);
	sendmess();
})

$(".editor_message").click(function() {
	$('#reply_content').hide();
	$('#emojis').hide();

});

$(".items_a").click(function() {
	$('#reply_content').hide();
	$('#emojis').hide();
})

//导航栏切换
$(".system").click(function(event) {
	$(".system-wrap").show();
	$(".custom-wrap").hide();
	$(".common-wrap").hide();
	$(".content_top .system p").css({
		"color": "#fff"
	});
	$(".content_top .system span").css({
		"display": "block"
	});
	$(".content_top .custom p").css({
		"color": "#C4C4C4"
	});
	$(".content_top .custom span").css({
		"display": "none"
	});
	$(".content_top .common p").css({
		"color": "#C4C4C4"
	});
	$(".content_top .common span").css({
		"display": "none"
	});
});

$(".custom").click(function(event) {
	$(".system-wrap").hide();
	$(".custom-wrap").show();
	$(".common-wrap").hide();
	$(".content_top .custom p").css({
		"color": "#fff"
	});
	$(".content_top .custom span").css({
		"display": "block"
	});
	$(".content_top .system p").css({
		"color": "#C4C4C4"
	});
	$(".content_top .system span").css({
		"display": "none"
	});
	$(".content_top .common p").css({
		"color": "#C4C4C4"
	});
	$(".content_top .common span").css({
		"display": "none"
	});
});

$(".common").click(function(event) {
	$(".system-wrap").hide();
	$(".custom-wrap").hide();
	$(".common-wrap").show();

	$(".content_top .common p").css({
		"color": "#fff"
	});
	$(".content_top .common span").css({
		"display": "block"
	});
	$(".content_top .system p").css({
		"color": "#C4C4C4"
	});
	$(".content_top .system span").css({
		"display": "none"
	});
	$(".content_top .custom p").css({
		"color": "#C4C4C4"
	});
	$(".content_top .custom span").css({
		"display": "none"
	});
});
//添加按钮 增加自定义提示语
var sum = 0;
$(".add_li").click(function() {
	sum += 1;
	var name = "add" + sum;
	var li = '<li class="li_' + name + '">' +
		'<span></span>' +
		'<div class="inBorder content_' + name + '" addDIV="1" contenteditable = "true"></div>' +
		'<ul class="operation">' +
		'<li class="save_' + name + '"><img src="images/reply4.png" alt=""></li>' +
		'<li class="editor_' + name + '" style="display: none;"><img src="images/reply2.png" alt=""></li>' +
		'<li class="delete_' + name + '"><img src="images/reply3.png" alt=""></li>' +
		'</ul>' +
		'</li>';
	$(".add_li").after(li);
	behavior(name); //给按钮添加   增删改查   操作
});
$(".add_li2").click(function() {
	sum += 1;
	var name = "add" + sum;
	var li = '<li class="wwc wwc_'+name+'">'
			+'<p><label>问:</label><input style="margin-left:15px" class="wt" type="text"/></p>'
			+'<p><label>答:</label><input style="margin-left:15px" class="da" type="text"/>'
				+'<label class="imcz1" onclick=wwc_add("'+name+'",-1)><img src="images/reply4.png" alt=""></label>'
				+'<label class="imcz2"  style="display: none;" onclick=wwc_bj("'+name+'")><img src="images/reply2.png" alt=""></label>'
				+'<label class="imcz3" onclick=wwc_del("'+name+'")><img src="images/reply3.png" alt=""></label>'
			+'</p><span class="id_id" style="display:none">-1</span>'
		+'</li>';
	$(".add_li2").after(li);
});
$(function() {
	var data = {};
	data.账号 = account;
	data.随机码 = random;
	data.行为 = '查询';
	$.ajax({
		type: "POST",
		url: ips + "/ajax.post?func=faq_reply",
		data: data,
		success: function(result) {
			if(result.状态 == '成功'){
				if(result.list && result.list.length > 0){
					var li = '';
					for (var i = 0; i < result.list.length; i++) {
						var ele = result.list[i];
						var name = "list" + ele.id;
						li += '<li class="ywc wwc_'+name+'">'
									+'<p><label>问:</label><input style="margin-left:15px" value="'+ele.关键字+'" class="wt" type="text"/></p>'
									+'<p><label>答:</label><input style="margin-left:15px" value="'+ele.回复内容+'" class="da" type="text"/>'
										+'<label class="imcz1"  style="display: none;" onclick=wwc_add("'+name+'")><img src="images/reply4.png" alt=""></label>'
										+'<label class="imcz2" onclick=wwc_bj("'+name+'")><img src="images/reply2.png" alt=""></label>'
										+'<label class="imcz3" onclick=wwc_del("'+name+'")><img src="images/reply3.png" alt=""></label>'
									+'</p><span class="id_id" style="display:none">'+ele.id+'</span>'
								+'</li>';
					}
					$(".add_li2").after(li);
				}
			}else{
				alert(result.状态);
			}
		}
	})
})
function wwc_del(name){
	var haveCon = confirm("您确定要删除吗？")
	var id = $('.wwc_'+name+' .id_id').html();
	if(haveCon){
		if(id == '-1' || !id){
			$('.wwc_'+name).remove();
		}else{
			var data = {};
			data.id = id;
			data.账号 = account;
			data.随机码 = random;
			data.行为 = '删除';
			$.ajax({
				type: "POST",
				url: ips + "/ajax.post?func=faq_reply",
				data: data,
				success: function(result) {
					if(result.状态 == '成功'){
						alert(result.状态);
						$('.wwc_'+name).remove();
					}else{
						alert(result.状态);
					}
				}
			})	
		}
	}
	
}

function wwc_add(name,id){
	//新增
	id = $('.wwc_'+name+' .id_id').html();
	if(id == '-1' || !id){
		var data = {};
		data.回答 = $('.wwc_'+name+' .da').val();
		data.问题 = $('.wwc_'+name+' .wt').val();
		data.账号 = account;
		data.随机码 = random;
		data.行为 = '添加';
		if(!data.回答){
			alert('关键字不能为空')
			return;
		}
		if(!data.问题){
			alert('快捷回复内容不能为空')
			return;
		}
		$.ajax({
			type: "POST",
			url: ips + "/ajax.post?func=faq_reply",
			data: data,
			success: function(result) {
				if(result.状态 == '成功'){
					$('.wwc_'+name+' input').attr("disabled","disabled");
					$('.wwc_'+name).removeClass('wwc');
					$('.wwc_'+name).addClass('ywc');
					$('.wwc_'+name+' .imcz1').hide();
					$('.wwc_'+name+' .imcz2').show();
					$('.wwc_'+name+' .id_id').html(result.id);
					alert(result.状态);
				}else{
					alert(result.状态);
				}
			}
		})
	}else{//修改
		var data = {};
		data.回答 = $('.wwc_'+name+' .da').val();
		data.问题 = $('.wwc_'+name+' .wt').val();
		data.账号 = account;
		data.随机码 = random;
		data.id = id;
		data.行为 = '修改';
		if(!data.回答){
			alert('关键字不能为空')
			return;
		}
		if(!data.问题){
			alert('快捷回复内容不能为空')
			return;
		}
		$.ajax({
			type: "POST",
			url: ips + "/ajax.post?func=faq_reply",
			data: data,
			success: function(result) {
				if(result.状态 == '成功'){
					$('.wwc_'+name+' input').attr("disabled","disabled");
					$('.wwc_'+name).removeClass('wwc');
					$('.wwc_'+name).addClass('ywc');
					$('.wwc_'+name+' .imcz1').hide();
					$('.wwc_'+name+' .imcz2').show();
					alert(result.状态);
				}else{
					alert(result.状态);
				}
			}
		})
	}
}
function wwc_bj(name){
	$('.wwc_'+name+' .imcz2').hide();
	$('.wwc_'+name+' .imcz1').show();
	$('.wwc_'+name).removeClass('ywc');
	$('.wwc_'+name).addClass('wwc');
	$('.wwc_'+name+' input').removeAttr("disabled");
}