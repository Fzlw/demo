#coding=utf-8

import base64
import json
import requests
import time
import hashlib

requests.packages.urllib3.disable_warnings()

userid = "657677"
url = "http://47.96.136.69:9191/201811/Accounts/%s/sms/sendsms"%userid

msg = base64.b64encode("您的验证码是123321，这是测试!【无忧管家】")

authtoken = "147134"
current_time = time.strftime("%Y%m%d%H%M%S")

def gen_+sig():
    m = hashlib.md5()
    m.update(userid + authtoken + current_time)
    return m.hexdigest().upper()

def sendsms():
    sms = {
    "SubSmss":[
            {
            "usermsgid":"012345678912",
            "desttermid":"13888888888",
            "srctermid":"",
            "msgcontent":msg,
            "signid":"",
            "desttype":"1"
            }
        ]
    }
    sms_js = json.dumps(sms)
    headers = {"Connection": "close", "Content-Type": "application/json; charset=utf-8",
            "Content-Length": str(len(sms_js)), "Authorization": base64.b64encode(userid+ ":" +current_time)}
    r = requests.post(url, params = {"sig": gen_sig()}, data = sms_js, headers
            = headers, verify=False)
    print r.text

if __name__ == '__main__':
    sendsms()