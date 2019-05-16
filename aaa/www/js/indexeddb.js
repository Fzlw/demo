function openDB (name,version,cd) {
	var version = version || 1;
	//没有就创建这个数据库，有就打开这个数据库，这里返回的是请求对象，库在它的result属性中，但request.result并不能获取数据库对象，请在回调里执行
	var request = window.indexedDB.open(name,version);
	//console.log(request)
	//共3个属性，其中，第一次建表请在onupgradeneeded回调函数中执行
	request.onerror = function(e) {
		console.log(e.currentTarget.error.message);
	}
	
	request.onsuccess = function(e) {
		//myDB强行全局化
		console.log('打开数据库...');
		//alert('打开数据库...')
		db = e.target.result;
		cd(db);
	}
	
	request.onupgradeneeded = function(e) {
		var db = e.target.result;
		//建聊天列表，以objectStore形式
		if(!db.objectStoreNames.contains('user_chat_list')) {
			//用户聊天列表，key为客服账号
			var store = db.createObjectStore('user_chat_list',{keyPath : 'sendId'});
			//索引一定跟着表一起创建，不能在创建完之后建索引，查询账号的索引值唯一 account重复是添加不了数据的
			store.createIndex('accountIndex','sendId',{unique : true});
			store.createIndex('timeIndex','sendTime',{unique : false});
			console.log('创建用户聊天列表成功...');
			
		}
		//建聊天列表，以objectStore形式
		if(!db.objectStoreNames.contains('service_chat_list')) {
			//用户聊天列表，key为客服账号
			var store = db.createObjectStore('service_chat_list',{keyPath : 'sendId'});
			//索引一定跟着表一起创建，不能在创建完之后建索引，查询账号的索引值唯一 account重复是添加不了数据的
			store.createIndex('serviceIndex','sendId',{unique : true});
			store.createIndex('timeIndex','sendTime',{unique : false});
			console.log('创建客服聊天列表成功...');

		}
		//建用户聊天记录
		if(!db.objectStoreNames.contains('user_chat_content')) {
			//用户聊天列表，key为客服账号
			var store = db.createObjectStore('user_chat_content',{keyPath:"id", autoIncrement: true});
			//索引一定跟着表一起创建，不能在创建完之后建索引，查询账号的索引值唯一 account重复是添加不了数据的
			store.createIndex('accountIndex','sendId',{unique : false});
			store.createIndex('getIndex','getId',{unique : false});
			store.createIndex('timeIndex','sendTime',{unique : false});
			store.createIndex('myindex', ['getId','sendTime'], {unique:false});
			console.log('创建聊天记录成功...');
		}
		//建客服聊天记录
		if(!db.objectStoreNames.contains('service_chat_content')) {
			//用户聊天列表，key为客服账号
			var store = db.createObjectStore('service_chat_content',{keyPath:"id", autoIncrement: true});
			//索引一定跟着表一起创建，不能在创建完之后建索引，查询账号的索引值唯一 account重复是添加不了数据的
			store.createIndex('serviceIndex','sendId',{unique : false});
			store.createIndex('getIndex','getId',{unique : false});
			store.createIndex('timeIndex','sendTime',{unique : false});
			store.createIndex('myindex', ['getId','sendTime'], {unique:false});
			console.log('创建聊天记录成功...');
		}
		
		//删除某个表
		//db.deketeObjectStore('user_chat_list');
		
		console.log('当前的版本为' + version + '...');
	}
	
	
}

//关闭数据库
function closeDB(db) {
	console.log('关闭数据库...');
	db.close();
}

//删除数据库
function deleteDB(name) {
	console.log('删除数据库...');
	window.indexedDB.deleteDatabase(name);
}

//用索引获取数据
function getDataByIndex(db,storeName) {
	var store = storeOfRW(db,storeName);
	var index = store.index('accountIndex');
	//这个是账号为15685166218的数据查找，这里只是一个值，不是所有值哦
	index.get('15685166218').onsuccess = function(e) {
		var user_chat_list_data = e.target.result;
		console.log(user_chat_list_data);
	}
}

//用键获取数据
function getDataByKey(db,storeName,key) {
	/*var transaction = db.transaction(storeName,'readwrite');
	var store = transaction.objectStore(storeName);*/
	var store = storeOfRW(db,storeName);
	console.log('获取数据...');
	store.get(key).onsuccess = function(e) {
		var user_chat_list_data = e.target.result;
		console.log(user_chat_list_data);
	};
	
}

//表中添加数据
function addData(db,data,storeName) {
	//开启可读写的事务
	var store = storeOfRW(db,storeName);
	console.log('添加数据...');
	for(var i = 0; i<data.length; i++) {
		store.add(data[i]);
	}
}

//更新/添加数据 没有数据就添加，有数据就更新
function updateDataByKey(db,storeName,newData){
    var store = storeOfRW(db,storeName);
    console.log('更新数据...');
    store.put(newData); 
}

//删除表中数据
function deleteDataByKey(db,storeName,dataKey) {
	var store = storeOfRW(db,storeName);
	console.log('删除数据...');
	store.delete(dataKey);
}

//删除表 在升级函数里调用
function clearObjectStore(db,storeName) {
	var store = storeOfRW(db,storeName);
	store.clear();
}

//获取可读写的表
function storeOfRW(db,storeName) {
	var transaction = db.transaction(storeName,'readwrite');
	var store = transaction.objectStore(storeName);
	return store;
}

//分页查询
function chatListPage(db,storeName,index,dataRange,start,end,ord) {
	var i = 0
	var store = storeOfRW(db,storeName);
	store.index(index).openCursor(dataRange,ord).onsuccess = function(e) {
		var cursor = e.target.result;
		i ++;
		if(cursor) {
			//console.log(cursor);
			//以全局去控制条数
			if(i >= start && i <= end){
				console.log(cursor.value);
			}
			if(i <= end){
				cursor.continue();
			}
		}
	};
}