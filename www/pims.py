#!/usr/bin/env python3

from flask import Flask, request, render_template, make_response
import random
from urllib.parse import quote_plus
from pymongo import MongoClient
from bson.json_util import dumps
from pathlib import Path
import json
import ldap
import time

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login", methods = ['POST', 'GET'])
def process_login():
    """
    Validates an username / password combination and generates
    a session id to authenticate them in future

    @username:  Their BI username
    @password:  The unhashed version of their password

    @returns:   Forwards the session code to the json response
    """
    form = get_form()
    username = form["username"]
    password = form["password"]

    # We might not try the authentication for a couple of reasons
    # 
    # 1. We might have blocked this IP for too many failed logins
    # 2. We might have locked this account for too many failed logins

    # Calculate when any timeout ban would have to have started so that
    # it's expired now
    timeout_time = int(time.time())-(60*(int(server_conf["security"]["lockout_time_mins"])))


    # We'll check the IP first
    ip = ips.find_one({"ip":request.remote_addr})
    
    if ip and len(ip["failed_logins"])>=server_conf["security"]["failed_logins_per_ip"]:
        # Find if they've served the timeout
        last_time = ip["failed_logins"][-1]

        if last_time < timeout_time:
            # They've served their time so remove the records of failures
            ips.update_one({"ip":request.remote_addr},{"$set":{"failed_logins":[]}})

        else:
            raise Exception("IP block timeout")

    # See if we have a record of failed logins for this user
    person = people.find_one({"username":username})

    if person and person["locked_at"]:
        if person["locked_at"] > timeout_time:
            # Their account is locked
            raise Exception("User account locked")
        else:
            # They've served their time, so remove the lock
            # and failed logins
            people.update_one({"username":username},{"$set":{"locked_at":0}})
            people.update_one({"username":username},{"$set":{"failed_logins":[]}})


    # Check the password against AD
    conn = ldap.initialize("ldap://"+server_conf["server"]["ldap"])
    conn.set_option(ldap.OPT_REFERRALS, 0)
    try:    
        conn.simple_bind_s(username+"@"+server_conf["server"]["ldap"], password)

        # Clear any IP recorded login fails
        ips.delete_one({"ip":request.remote_addr})

        sessioncode = generate_id(20)


        if not person:
            # We're making a new person.  We can therefore query AD
            # to get their proper name and email.

            # We can theoretically look anyone up, but this filter says
            # that we're only interested in the person who logged in
            filter = f"(&(sAMAccountName={username}))"

            # The values we want to retrive are their real name (not 
            # split by first and last) and their email
            search_attribute = ["distinguishedName","mail"]

            # This does the search and gives us back a search ID (number)
            # which we can then use to fetch the result data structure
            dc_string = ",".join(["DC="+x for x in server_conf["server"]["ldap"].split(".")])
            res = conn.search(dc_string,ldap.SCOPE_SUBTREE, filter, search_attribute)
            answer = conn.result(res,0)

            # We can then pull the relevant fields from the results
            name = answer[1][0][1]["distinguishedName"][0].decode("utf8").split(",")[0].replace("CN=","")
            email = answer[1][0][1]["mail"][0].decode("utf8")

            # Now we can make the database entry for them
            new_person = {
                "username": username,
                "name": name,
                "email": email,
                "disabled": False,
                "sessioncode": "",
                "locked_at": 0,
                "failed_logins": [],
                "is_admin": False
            }
        
            people.insert_one(new_person)

        # We can assign the new sessioncode to them and then return it
        people.update_one({"username":username},{"$set":{"sessioncode": sessioncode}})

        response = make_response(sessioncode)
        response.set_cookie("pims_session_id",sessioncode)
        return(response)
    
    except ldap.INVALID_CREDENTIALS:
        # We need to record this failure.  If there is a user with this name we record
        # against that.  If not then we just record against the IP
        if person:
            people.update_one({"username":username},{"$push":{"failed_logins":int(time.time())}})
            if len(person["failed_logins"])+1 >= server_conf["security"]["failed_logins_per_user"]:
                # We need to lock their account
                people.update_one({"username":username},{"$set":{"locked_at":int(time.time())}})
                


        if not ip:
            ips.insert_one({"ip":request.remote_addr,"failed_logins":[]})

        ips.update_one({"ip":request.remote_addr},{"$push":{"failed_logins":int(time.time())}})

        raise Exception("Incorrect Username/Password from LDAP")

@app.route("/validate_session", methods = ['POST', 'GET'])
def validate_session():
    form = get_form()
    person = checksession(form["session"])
    return(str(person["name"]))


@app.route("/get_user_data", methods = ['POST', 'GET'])
def get_user_data():
    form = get_form()
    person = checksession(form["session"])

    return jsonify(person)


def get_form():
    # In addition to the main arguments we also add the session
    # string from the cookie
    session = ""

    if "pims_session_id" in request.cookies:
        session = request.cookies["pims_session_id"]

    if request.method == "GET":
        form = request.args.to_dict(flat=True)
        form["session"] = session
        return form

    elif request.method == "POST":
        form = request.form.to_dict(flat=True)
        form["session"] = session
        return form


def generate_id(size):
    """
    Generic function used for creating IDs.  Makes random IDs
    just using uppercase letters

    @size:    The length of ID to generate

    @returns: A random ID of the requested size
    """
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    code = ""

    for _ in range(size):
        code += random.choice(letters)

    return code


def checksession (sessioncode):
    """
    Validates a session code and retrieves a person document

    @sessioncode : The session code from the browser cookie

    @returns:      The document for the person associated with this session
    """

    person = people.find_one({"sessioncode":sessioncode})

    if "disabled" in person and person["disabled"]:
        raise Exception("Account disabled")

    if person:
        return person

    raise Exception("Couldn't validate session")



def jsonify(data):
    # This is a function which deals with the bson structures
    # specifically ObjectID which can't auto convert to json 
    # and will make a flask response object from it.
    response = make_response(dumps(data))
    response.content_type = 'application/json'

    return response

def get_server_configuration():
    with open(Path(__file__).resolve().parent.parent / "configuration/conf.json") as infh:
        conf = json.loads(infh.read())
    return conf


def connect_to_database(conf):

    client = MongoClient(
        conf['server']['address'],
        username = conf['server']['username'],
        password = conf['server']['password'],
        authSource = "pims_database"
    )


    db = client.webbase_database

    global people
    people = db.people_collection

    global ips
    ips = db.ips_collection


# Read the main configuration
server_conf = get_server_configuration()

# Connect to the database
connect_to_database(server_conf)


