import json
import random

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Ngcp:
    def __init__(self, addr: str, username: str, password: str):
        self.__api_addr = f"{addr}/api"
        self.__session = requests.Session()
        self.__session.verify = False
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        self.__session.auth = (username, password)
        self.__session.headers.update(headers)

    def request(self, method: str, path: str, data=None):
        """Generic request method used for all API calls to Ngcp

        Generic request method used for all API calls that
        returns the 'data' field from the response.

        Args:
            method: HTTP method used for the request
            path:   Path of the API to call
            data:   Request data

        Raises:
            RequestError: if request fails
            UnavailableError: if the URL cannot be reached or times out
        """
        method = method.upper()
        path = self.__api_addr + path
        r = requests.Response
        try:
            if data is not None:
                r = self.__session.request(method=method, url=path, json=data)
            else:
                r = self.__session.request(method=method, url=path)
            r.raise_for_status()
            return r
        except requests.exceptions.RequestException as e:
            print(f"{e}: {json.dumps(r.json().get('message'), sort_keys=True, indent=4)}")


def test_systemcontacts(ngcp: Ngcp, username: str, formatted: bool = False):
    print(f"\nPOST systemcontact as {username}")
    syscontact = ngcp.request("POST", "/systemcontacts", {
        "newsletter": False,
        "status": "active",
        "email": "pythontest@example.example"
    })
    print_response(syscontact, formatted)

    syscontact_id = syscontact.json()["id"] if syscontact is not None else "3"
    print("Systemcontact ID:", syscontact_id)

    print(f"\nGET all systemcontacts as {username}")
    print_response(ngcp.request("GET", "/systemcontacts"), formatted)

    print(f"\nGET previously created systemcontact as {username}")
    print_response(ngcp.request("GET", f"/systemcontacts/{syscontact_id}"), formatted)

    print(f"\nPUT previously created systemcontact as {username}")
    syscontact = ngcp.request("PUT", f"/systemcontacts/{syscontact_id}", {
        "newsletter": True,
        "status": "active",
        "email": "supertest@example.example",
        "postcode": "1010"
    })
    print_response(syscontact, formatted)

    print(f"\nPATCH previously created systemcontact as {username}")
    syscontact = ngcp.request("PATCH", f"/systemcontacts/{syscontact_id}", data=[
        {
            "op": "replace",
            "path": "/newsletter",
            "value": False
        },
        {
            "op": "replace",
            "path": "/postcode",
            "value": "3163"
        }
    ])
    print_response(syscontact, formatted)

    print(f"\nJOURNAL of previously created systemcontact as {username}")
    journal = ngcp.request("GET", f"/systemcontacts/{syscontact_id}/journal")
    print_response(journal)

    print(f"\nDELETE created systemcontact as {username}")
    res = ngcp.request("DELETE", f"/systemcontacts/{syscontact_id}")
    print_response(res, formatted)


def test_resellers(ngcp: Ngcp, username: str, formatted: bool = False):
    print(f"\nPOST systemcontact as {username}")
    syscontact = ngcp.request("POST", "/systemcontacts", {
        "newsletter": False,
        "status": "active",
        "email": "pythontest@example.example"
    })
    print_response(syscontact, formatted=formatted)

    syscontact_id = syscontact.json()["id"] if syscontact is not None else "3"
    print("Systemcontact ID:", syscontact_id)

    print(f"\nPOST contract as {username}")
    contract = ngcp.request("POST", "/contracts", {
        "contact_id": syscontact_id,
        "status": "active",
        "type": "reseller"
    })
    print_response(contract, formatted=formatted)

    contract_id = contract.json()["id"] if contract is not None else None
    print("Contract ID: ", contract_id)

    reseller_payload = {
        "name": f"from_python_test{random.randint(0, 10000)}",
        "status": "active",
        "contract_id": contract_id
    }
    print(f"\nPOST reseller as {username}")
    reseller = ngcp.request("POST", "/resellers", reseller_payload)
    print_response(reseller, formatted=formatted)

    print(f"\nGET all resellers as {username}")
    print_response(ngcp.request("GET", "/resellers"), formatted)

    reseller_id = reseller.json()["id"] if reseller is not None else None

    print(f"\nGET previously created reseller as {username}")
    print_response(ngcp.request("GET", f"/resellers/{reseller_id}"), formatted)

    reseller_payload["status"] = "terminated"
    print(f"\nPUT previously created reseller as {username}")
    syscontact = ngcp.request("PUT", f"/resellers/{reseller_id}", reseller_payload)
    print_response(syscontact, formatted)

    print(f"\nPATCH previously created resller as {username}")
    syscontact = ngcp.request("PATCH", f"/resellers/{reseller_id}", data=[
        # {
        #     "op": "replace",
        #     "path": "/status",
        #     "value": ["gugugaga"]
        # },
        {
            "op": "replace",
            "path": "/name",
            "value": f"patched_reseller_{random.randint(0, 10000)}"
        }
    ])
    print_response(syscontact, formatted)


def test_contracts(ngcp: Ngcp, username: str, formatted: bool = False):
    print(f"\nPOST systemcontact as {username}")
    syscontact = ngcp.request("POST", "/systemcontacts", {
        "newsletter": False,
        "status": "active",
        "email": "pythontest@example.example"
    })
    print_response(syscontact, formatted=formatted)

    syscontact_id = syscontact.json()["id"] if syscontact is not None else "3"
    print("Systemcontact ID:", syscontact_id)

    contract_payload = {
        "contact_id": syscontact_id,
        "status": "active",
        "type": "reseller"
    }
    print(f"\nPOST contract as {username}")
    contract = ngcp.request("POST", "/contracts", contract_payload)
    print_response(contract, formatted=formatted)

    contract_id = contract.json()["id"] if contract is not None else None
    print("Contract ID: ", contract_id)

    print(f"\nGET all contracts")
    response = ngcp.request("GET", "/contracts")
    print_response(response, formatted=formatted)

    print(f"\nGET previously created contract")
    response = ngcp.request("GET", f"/contracts/{contract_id}")
    print_response(response, formatted=formatted)

    print(f"\nPUT previously created contract")
    contract_payload["status"] = "terminated"
    response = ngcp.request("PUT", f"/contracts/{contract_id}", contract_payload)
    print_response(response, formatted=formatted)

    print(f"\nPATCH previously created contract")
    response = ngcp.request("PATCH", f"/contracts/{contract_id}", data=[
        {
            "op": "replace",
            "path": "/status",
            "value": "active"
        }
    ])
    print_response(response, formatted=formatted)


def test_domains(ngcp: Ngcp, username: str, formatted: bool = False):
    print(f"\nGET all domains as {username}")
    response = ngcp.request("GET", "/domains")
    print_response(response, formatted)

    print(f"\nPOST domain as {username}")
    response = ngcp.request("POST", "/domains", {"domain": "test_domain", "reseller_id": 1})
    print_response(response, formatted)
    domain_id = response.json()["id"]

    print(f"\nGET created domain")
    response = ngcp.request("GET", f"/domains/{domain_id}")
    print_response(response, formatted)

    print("\nDELETE domain")
    response = ngcp.request("DELETE", f"/domains/{domain_id}")
    print_response(response, formatted)

    if (username == "reseller"):
        print("\nCreating domain with different reseller_id")
        response = requests.post("https://localhost:3443/api/domains", auth=('administrator','administrator'), json={"domain": "test_domain", "reseller_id": 1}, verify=False)
        domain_id = response.json()["id"]

        print("\nDELETE domain with different reseller_id")
        response = ngcp.request("DELETE", f"/domains/{domain_id}")
        print_response(response, formatted)

        print("\nDELETE domain as admin")
        requests.delete(f"https://localhost:3443/api/domains/{domain_id}", auth=('administrator', 'administrator'), verify=False)

def print_response(r: requests.Response, formatted: bool = False):
    if r is None:
        return
    print("STATUS CODE: ", r.status_code)
    if formatted:
        print(json.dumps(r.json(), indent=4, sort_keys=True))
    else:
        print(r.text)


def test_admins(ngcp: Ngcp, role: str):

    cases = {
        "system": [
            {"system": True, "admin_master": True, "admin": True, "reseller_master": True, "reseller": True},
        ],
        "admin_master": [
            {"system": False, "admin_master": True, "admin": True, "reseller_master": True, "reseller": True},
        ],
        "admin": [
            {"system": False, "admin_master": False, "admin": True, "reseller_master": True, "reseller": True},
        ],
        "reseller_master": [
            {"system": False, "admin_master": False, "admin": False, "reseller_master": True, "reseller": True},
        ],
        "reseller": [
            {"system": False, "admin_master": False, "admin": False, "reseller_master": True, "reseller": True},
        ]
    }

    suffix = random.randint(10000, 99999)
    ngcp.request("POST", "/admins", {
        "reseller_id": 1,
        "login": f"api_reseller{suffix}",
        "is_master": False,
        "is_superuser": False,
        "is_ccare": False,
        "is_active": True,
        "read_only": False,
        "show_passwords": False,
        "call_data": False,
        "billing_data": False,
        "lawful_intercept": False,
        "email": f"api_reseller{suffix}@example.com",
        "can_reset_password": True,
        "is_system": False,
        "password": f"api_reseller{suffix}"
    })
    ngcp.request("POST", "/admins", {
        "reseller_id": 1,
        "login": f"api_reseller_master{suffix}",
        "is_master": True,
        "is_superuser": False,
        "is_ccare": False,
        "is_active": True,
        "read_only": False,
        "show_passwords": False,
        "call_data": False,
        "billing_data": False,
        "lawful_intercept": False,
        "email": f"api_reseller{suffix}@example.com",
        "can_reset_password": True,
        "is_system": False,
        "password": f"api_reseller_master{suffix}"
    })
    ngcp.request("POST", "/admins", {
        "reseller_id": 1,
        "login": f"api_admin{suffix}",
        "is_master": False,
        "is_superuser": True,
        "is_ccare": False,
        "is_active": True,
        "read_only": False,
        "show_passwords": False,
        "call_data": False,
        "billing_data": False,
        "lawful_intercept": False,
        "email": f"api_admin{suffix}@example.com",
        "can_reset_password": True,
        "is_system": False,
        "password": f"api_admin{suffix}"
    })
    ngcp.request("POST", "/admins", {
        "reseller_id": 1,
        "login": f"api_admin_master{suffix}",
        "is_master": True,
        "is_superuser": True,
        "is_ccare": False,
        "is_active": True,
        "read_only": False,
        "show_passwords": False,
        "call_data": False,
        "billing_data": False,
        "lawful_intercept": False,
        "email": f"api_admin{suffix}@example.com",
        "can_reset_password": True,
        "is_system": False,
        "password": f"api_admin_master{suffix}"
    })


def init_users(ngcp: Ngcp):
    ngcp.request("POST", "/admins", {
        "reseller_id": 3,
        "login": "api_reseller",
        "is_master": False,
        "is_superuser": False,
        "is_ccare": False,
        "is_active": True,
        "read_only": False,
        "show_passwords": False,
        "call_data": False,
        "billing_data": False,
        "lawful_intercept": False,
        "email": "api_reseller@example.com",
        "can_reset_password": True,
        "is_system": False,
        "password": "api_reseller"
    })
    ngcp.request("POST", "/admins", {
        "reseller_id": 3,
        "login": "api_reseller_master",
        "is_master": True,
        "is_superuser": False,
        "is_ccare": False,
        "is_active": True,
        "read_only": False,
        "show_passwords": False,
        "call_data": False,
        "billing_data": False,
        "lawful_intercept": False,
        "email": "api_reseller@example.com",
        "can_reset_password": True,
        "is_system": False,
        "password": "api_reseller_master"
    })
    ngcp.request("POST", "/admins", {
        "reseller_id": 1,
        "login": "api_admin",
        "is_master": False,
        "is_superuser": True,
        "is_ccare": False,
        "is_active": True,
        "read_only": False,
        "show_passwords": False,
        "call_data": False,
        "billing_data": False,
        "lawful_intercept": False,
        "email": "api_admin@example.com",
        "can_reset_password": True,
        "is_system": False,
        "password": "api_admin"
    })
    ngcp.request("POST", "/admins", {
        "reseller_id": 1,
        "login": "api_admin_master",
        "is_master": True,
        "is_superuser": True,
        "is_ccare": False,
        "is_active": True,
        "read_only": False,
        "show_passwords": False,
        "call_data": False,
        "billing_data": False,
        "lawful_intercept": False,
        "email": "api_admin@example.com",
        "can_reset_password": True,
        "is_system": False,
        "password": "api_admin_master"
    })


if __name__ == '__main__':
    ngcp = Ngcp(addr="https://localhost:3443", username="administrator", password="administrator")
    # init_users(ngcp)
    users = [
        {"username": "administrator", "role": "system"},
        {"username": "api_admin", "role": "admin"},
        {"username": "api_reseller", "role": "reseller"},
        {"username": "api_admin_master", "role": "admin_master"},
        {"username": "api_reseller_master", "role": "reseller_master"},
    ]
    for user in users:
        username, password = user["username"], user["username"]
        ngcp = Ngcp(addr="https://localhost:3443", username=username, password=password)

        # test_systemcontacts(ngcp, user["role"], formatted=False)
        # test_resellers(ngcp, user["role"], formatted=False)
        # test_contracts(ngcp, user["role"], formatted=False)
        test_domains(ngcp, user["role"], formatted=True)
