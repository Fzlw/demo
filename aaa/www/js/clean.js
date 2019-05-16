/**
 * Created by he on 2017/7/27.
 */
//账户中心    修改密码/退出登录/清除记录     加     关闭聊天

//账户中心 下面小图标切换
$(".lixiu").mouseenter(function () {
    $(".imgxiu").attr("src", "images/dianji2.png")
});
$(".lixiu").mouseleave(function () {
    $(".imgxiu").attr("src", "images/weidian.png")
});
$(".litui").mouseenter(function () {
    $(".imgtui").attr("src", "images/weidian-yuichu.png")
});
$(".litui").mouseleave(function () {
    $(".imgtui").attr("src", "images/tuichu.png")
});
$(".liqing").mouseenter(function () {
    $(".imgqing").attr("src", "images/dianji.png")
});
$(".liqing").mouseleave(function () {
    $(".imgqing").attr("src", "images/meidian.png")
});



//退出登录
$("#exit").click(function () {
    if (confirm("确定要退出吗？")) {
        if (!sessionStorage.getItem('user_id')) {
            window.location.href = "/";
            return;
        }
        data = {};
        data.account = account;
        $.ajax({
            type: "POST",
            url: ips + "/ajax.post?func=serve_exit",
            data: data,
            success: function (json) {
                // alert(json.状态);
                if (json.状态 != "成功") {
                    alert(json.状态);
                } else {
                    sessionStorage.removeItem('user_id');
                    window.location.href = "/";
                }
            }
        });
    }
})


//清除记录
$("#clearMessage").click(function () {
    var con = confirm("您确定要删除所有聊天记录吗？");
    if (con) {
        openDB(myDB.dbName, myDB.version, function (db) {
            var store1 = storeOfRW(db, myDB.objectStore1);
            var store2 = storeOfRW(db, myDB.objectStore2);
            var store3 = storeOfRW(db, myDB.objectStore3);
            var store4 = storeOfRW(db, myDB.objectStore4);
            store1.clear();
            store2.clear();
            store3.clear();
            store4.clear();

            //删除左边联系人
            $("#message_list").children("li").remove();
            $(".message_num1").remove();

            //删除中间内容
            $('.top_bar ').find('.img_show').attr('src', 'images/team-18.png');   //清空联系人图标
            $('.top_bar ').find('.name_show').text("");                          //清空联系人昵称
            $('.show_bb').remove();                                              //清空消息记录
        })
    }
});

var gb_account = '';
//关闭聊天
$(".deles").click(function () {
    if (confirm("确认关闭连接吗")) {
        var lights = $(".lights").attr('id');
        gb_account = lights;
        var receiveId = lights+ "_";
        var receiveIds = receiveId.split("_");
        gd(lights);
    }
})

function gdss(lights){
    console.log('ssssssssssssssssssssssssssssssssssssssssssssssssssssssss')
    $.ajax({
        type: "POST",
        url: ips + "/ajax.post?func=user_gd",
        data: $.param({"userid":lights,"services":account}),
        success: function (res) {
            if(res.状态 != '成功'){
                alert(res.状态);
                return;
            }
        }
    })
}

function gd(lights){
    var id = "#" + lights;
    //删除前发送结束会话语
    $('.editor_message').text("会话结束,感谢您的来访!!!");
    //console.log($('.editor_message').text());
    sendmess();
    //删除中间内容
    $('.top_bar ').find('.img_show').attr('src', 'images/team-18.png');   //清空联系人图标
    $('.top_bar ').find('.name_show').text("");                          //清空联系人昵称
    $('.show_bb').remove();                                              //清空消息记录

    //删除左边联系人列表
    //	console.log($(id).parent("#message_list"));
    $("#message_list").find($(id)).remove();
    openDB(myDB.dbName, myDB.version, function (db) {
        if (lights) {
            if (lights.substr(lights.length - 8) == "_service") {   //判断联系人是  客服/会员
                var store1 = storeOfRW(db, myDB.objectStore3);
            } else {
                var store1 = storeOfRW(db, myDB.objectStore1);
            }
            store1.delete(lights);
        }

    });
}