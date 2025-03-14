const MANAGEMENT_URL = '/api/admin/manage';
const STATISTICS_URL = '/api/stats/data';
let CSK_LIST = [];
let DISTRIBUTOR_LIST = [];
let ID_TOKEN = sessionStorage.getItem("id_token");
let DISTRIBUTOR_ID = "";
const languages = { "en-US": "English", "es-ES": "Spanish" }
let distributors = {};
let pinger = null;
let selectedMenu = { target: { id: "list-customers-button", content: "list-customers" } };

let now = new Date();
let earlier = new Date();
earlier.setMonth(now.getMonth() - 1);
document.getElementById(`actions-from`).value = earlier.toISOString().split('T')[0];
document.getElementById(`actions-to`).value = now.toISOString().split('T')[0];
document.getElementById(`deployments-from`).value = earlier.toISOString().split('T')[0];
document.getElementById(`deployments-to`).value = now.toISOString().split('T')[0];

// Run once on app load
async function populateDistributorOptions() {
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "get_my_distributors",
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        pinger = setInterval(() => {
          ping();
        }, 60000)
        if (resBody.hasOwnProperty("user_is_admin") && resBody.user_is_admin === "true") {
          showAdminFeatures();
        }
        let select = document.getElementById("distributor-options");
        // let logo = document.getElementById("distributor-logo");
        if (Object.keys(resBody.distributors).length > 1) {
          for (let distributor_id in resBody.distributors) {
            let opt = document.createElement('option');
            opt.value = distributor_id;
            opt.label = resBody.distributors[distributor_id].name;
            select.appendChild(opt);
            distributors[distributor_id] = resBody.distributors[distributor_id];
          }
          // Set default value to first distributor
          select.selectedIndex = 0;
          DISTRIBUTOR_ID = select.value;
          select.style.display = "inline-block";
        }
        else {
          DISTRIBUTOR_ID = Object.keys(resBody.distributors)[0];
          distributors[DISTRIBUTOR_ID] = resBody.distributors[DISTRIBUTOR_ID];
          // logo.src = resBody.distributors[DISTRIBUTOR_ID].logo;
          // logo.style.display = "inline-block";
        }

        configureConfigView(DISTRIBUTOR_ID);
        switchLeftMenuItem({ target: { id: "about-button", content: "about-csk" } });

        select.addEventListener('change', function () {
          DISTRIBUTOR_ID = this.value;
          // console.log(DISTRIBUTOR_ID);
          configureConfigView(DISTRIBUTOR_ID);
          switchLeftMenuItem(selectedMenu);
        });
        document.getElementById('loading-block').style.display = "none";
      } else {
        console.log("Failed to fetch distributor list");
        console.log(response.status, response.statusText);
        if (confirm("Couldn't get configuration, would you like to logout and log back in?")) {
          logout()
        }
      }
    } else {
      console.log("Didn't get an OK response");
      console.log(response.status, response.statusText);
      if (confirm("Configuration request failed, would you like to log back in?")) {
        logout()
      }
    }
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      logout()
    }
  }
}

function showAdminFeatures() {
  document.getElementById('list-distributors-button').hidden = false;
  document.getElementById('manage-users-button').hidden = false;
  document.getElementById('create-distributor-button').hidden = false;
}

function configureConfigView(dist_id) {
  let distData = distributors[dist_id];
  document.getElementById('config-data').innerText = JSON.stringify(distData);
  let logo = document.getElementById("distributor-logo");
  logo.src = distData.logo;
  logo.style.display = "inline-block";
}

function logout() {
  let cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    if (cookies[i].includes('Cognito')) {
      document.cookie = `${cookies[i].split('=')[0]}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  }
  sessionStorage.removeItem("id_token");
  window.location.href = `https://auth.${window.location.hostname.replace(/^admin\./, '')}/logout?client_id=CLIENT_ID&redirect_uri=https://${window.location.hostname}&response_type=code`;
}

function highlightActiveLeftMenuButton(target) {
  let menuItems = document.getElementsByClassName('left-hand-menu-item');
  for (let i = 0; i < menuItems.length; i++) {
    menuItems[i].classList.remove('left-hand-menu-item-selected');
    let targetedContent = menuItems[i].getAttribute('content');
    if (targetedContent) {
      document.getElementById(targetedContent).hidden = true;
    }
  }
  let targetedContent = target.hasOwnProperty('content') ? target.content : target.getAttribute('content');
  document.getElementById(targetedContent).hidden = false;

  document.getElementById(target.id).classList.add('left-hand-menu-item-selected');
}

async function switchLeftMenuItem(event) {
  let targetedContent = event.target.hasOwnProperty('content') ? event.target.content : event.target.getAttribute('content');
  selectedMenu = event;
  highlightActiveLeftMenuButton(event.target);
  if (targetedContent === "list-customers") {
    CSK_LIST = await fetchCustomerList();
    clearCustomerList();
    populateCustomerList(CSK_LIST);
  }
  else if (targetedContent === "list-distributors") {
    DISTRIBUTOR_LIST = await fetchDistributorList();
    clearDistributorList();
    populateDistributorList(DISTRIBUTOR_LIST);
  }
  else if (targetedContent === "create-customer") {
    populateLanguageDropdown(document.getElementById("preferred-language"));
    populateLogo(document.getElementById("logo-url"))
  }
  else if (targetedContent === "manage-users") {
    listUsers();
  }

}

async function fetchCustomerList() {
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "list_csks",
          "distributor_id": DISTRIBUTOR_ID
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        return resBody.csks;
      } else {
        console.log("Failed to fetch customer list");
      }
    } else {
      console.log("Failed to fetch customer list");
      console.log(response.status, response.statusText);
    }
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

function clearCustomerList() {
  let customerList = document.getElementById('customer-list');
  while (customerList.firstChild) {
    customerList.removeChild(customerList.firstChild);
  }
}

function populateCustomerList(cskList) {
  let customerList = document.getElementById('customer-list');
  for (let i = 0; i < cskList.length; i++) {
    let customer = cskList[i];
    let customerCardTemplate = document.getElementById("customer-card-template");

    let customerItem = customerCardTemplate.content.cloneNode(true);

    let logo = customerItem.querySelector("img");
    logo.src = customer.config.LogoUrl;
    logo.alt = `${customer.config.BusinessName} Logo`;
    customerItem.querySelector("h2").innerText = customer.config.BusinessName;

    customerItem.querySelector("table").setAttribute("customer", customer.csk_id);
    customerItem.querySelector("td[info='csk-id']").innerText = customer.csk_id;
    customerItem.querySelector("td[info='default-region']").innerText = customer.config.DefaultRegion;
    customerItem.querySelector("td[info='country-code']").innerText = customer.config.CountryCode;
    customerItem.querySelector("td[info='preferred-language']").innerText = languages[customer.config.PreferredLanguage];
    customerItem.querySelector("td[info='logo-url']").innerText = customer.config.LogoUrl;
    customerItem.querySelector("td[info='logo-css-left']").innerText = customer.config.LogoCssLeft;
    customerItem.querySelector("td[info='logo-css-right']").innerText = customer.config.LogoCssRight;
    customerItem.querySelector("td[info='file-host']").innerText = customer.config.FileHost;
    customerItem.querySelector("button[action='edit']").setAttribute("id", `edit-${customer.csk_id}`);
    customerItem.querySelector("button[action='edit']").setAttribute("customer", customer.csk_id);
    customerItem.querySelector("button[action='deactivate']").setAttribute("id", `deactivate-${customer.csk_id}`);
    customerItem.querySelector("button[action='deactivate']").setAttribute("customer", customer.csk_id);
    customerItem.querySelector("button[action='reactivate']").setAttribute("id", `reactivate-${customer.csk_id}`);
    customerItem.querySelector("button[action='reactivate']").setAttribute("customer", customer.csk_id);
    customerList.appendChild(customerItem);

    document.getElementById(`edit-${customer.csk_id}`).addEventListener("click", editCustomer);
    document.getElementById(`deactivate-${customer.csk_id}`).addEventListener("click", deactivateCustomer);
    document.getElementById(`reactivate-${customer.csk_id}`).addEventListener("click", reactivateCustomer);
    if (customer.status === "active") {
      document.getElementById(`reactivate-${customer.csk_id}`).style.display = "none"
    }
    else {
      document.getElementById(`deactivate-${customer.csk_id}`).style.display = "none"
    }
  }
}

async function fetchDistributorList() {
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "list_distributors",
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        DISTRIBUTOR_LIST = resBody.distributors;
        return DISTRIBUTOR_LIST;
      } else {
        console.log("Failed to fetch distributor list");
      }
    } else {
      console.log("Failed to fetch distributor list");
      console.log(response.status, response.statusText);
    }
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

function clearDistributorList() {
  let distributorList = document.getElementById('distributor-list');
  while (distributorList.firstChild) {
    distributorList.removeChild(distributorList.firstChild);
  }
}

function populateDistributorList(distiList) {
  let distributorList = document.getElementById('distributor-list');
  for (let i = 0; i < distiList.length; i++) {
    let distributor = distiList[i];
    let distributorCardTemplate = document.getElementById("distributor-card-template");

    let distributorItem = distributorCardTemplate.content.cloneNode(true);

    let logo = distributorItem.querySelector("img");
    logo.src = distributor.config.LogoUrl;
    logo.alt = `${distributor.config.BusinessName} Logo`;
    distributorItem.querySelector("h2").innerText = distributor.config.BusinessName;

    distributorItem.querySelector("table").setAttribute("distributor", distributor.distributor_id);
    distributorItem.querySelector("td[info='distributor-id']").innerText = distributor.distributor_id;
    distributorItem.querySelector("td[info='logo-url']").innerText = distributor.config.LogoUrl;
    distributorItem.querySelector("td[info='logo-css']").innerText = distributor.config.LogoCss;
    distributorItem.querySelector("td[info='file-host']").innerText = distributor.config.FileHost;
    distributorItem.querySelector("button[action='edit']").setAttribute("id", `edit-${distributor.distributor_id}`);
    distributorItem.querySelector("button[action='edit']").setAttribute("distributor", distributor.distributor_id);
    distributorList.appendChild(distributorItem);
    document.getElementById(`edit-${distributor.distributor_id}`).addEventListener("click", editDistributor);
  }
}
function reactivateCustomer(event) {
  let customerID = event.target.getAttribute('customer');
  activateCustomer(customerID, 'reactivate')
}
function deactivateCustomer(event) {
  let customerID = event.target.getAttribute('customer');
  activateCustomer(customerID, 'deactivate')
}
async function activateCustomer(customerID, action) {
  let customer = CSK_LIST.find(x => x.csk_id === customerID);
  if (window.confirm(`Are you sure you want to ${action} the CSK for "${customer.config.BusinessName}"?`)) {
    console.log(`${action} customer ${customerID}`);
    try {
      const response = await fetch(MANAGEMENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": ID_TOKEN
        },
        body: JSON.stringify(
          {
            "action": `${action}_csk`,
            "distributor_id": DISTRIBUTOR_ID,
            "csk_id": customerID
          }
        )
      });
      if (response.ok) {
        const resBody = await response.json();
        console.log(resBody);
        if (resBody.result === "success") {
          console.log(`Customer ${customerID} ${action}d successfully`);
          switchLeftMenuItem({ target: { id: "list-customers-button", content: "list-customers" } });
        } else {
          console.log(`Failed to ${action} Customer ${customerID}`);
        }
      } else {
        console.log(`Failed to ${action} Customer ${customerID}`);
        console.log(response.status, response.statusText);
      }
    }
    catch (e) {
      if (confirm("API call failed, would you like to log back in?")) {
        location.reload()
      }
    }
  }
}

function populateLanguageDropdown(dropdown) {
  dropdown.replaceChildren();
  for (let lang in languages) {
    let opt = document.createElement('option');
    opt.value = lang;
    opt.label = languages[lang];
    dropdown.appendChild(opt);
  }
}

function populateLogo(element, url = null) {
  if (url) {
    element.value = url;
  }
  else {
    element.value = `${window.location.protocol}//${window.location.hostname}/images/placeholder-logo.png`;
  }
}

function editCustomer(event) {
  let customerID = event.target.getAttribute('customer');
  let customer = CSK_LIST.find(x => x.csk_id === customerID);
  console.log(`Editing customer ${customerID}`);

  switchLeftMenuItem({ target: { id: "edit-customer-button", content: "edit-customer" } });
  populateEditCustomerForm(customer);
}

function populateEditCustomerForm(customer) {
  populateLanguageDropdown(document.getElementById("edit-preferred-language"));
  populateLogo(document.getElementById("edit-logo-url"), customer.config.LogoUrl);
  document.getElementById("edit-customer-id").value = customer.csk_id;
  document.getElementById("edit-business-name").value = customer.config.BusinessName;
  document.getElementById("edit-default-region").value = customer.config.DefaultRegion;
  document.getElementById("edit-country-code").value = customer.config.CountryCode;
  document.getElementById("edit-preferred-language").value = customer.config.PreferredLanguage;
  document.getElementById("edit-logo-url").innerText = customer.config.LogoUrl;
  document.getElementById("edit-logo-css-left").innerText = customer.config.LogoCssLeft;
  document.getElementById("edit-logo-css-right").innerText = customer.config.LogoCssRight;
  document.getElementById("edit-file-host").value = customer.config.hasOwnProperty('FileHost') ? customer.config.FileHost : "";
  document.getElementById("edit-kit-hub-code").value = customer.config.hasOwnProperty('KitHubCode') ? customer.config.KitHubCode : "";
}

const editCustomerForm = document.getElementById("edit-customer-form");

async function editCustomerSubmit() {
  document.getElementById('edit-customer-form-submit').disabled = true;
  const formData = new FormData(editCustomerForm);
  const customerData = Object.fromEntries(formData.entries());
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "update_csk",
          "distributor_id": DISTRIBUTOR_ID,
          ...customerData
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        displaySuccess("Customer updated successfully");
        switchLeftMenuItem({ target: { id: "list-customers-button", content: "list-customers" } });
      } else {
        displayErrors("Failed to update customer");
      }
    } else {
      displayErrors("Failed to update customer");
      console.log(response.status, response.statusText);
    }
    document.getElementById('edit-customer-form-submit').disabled = false;
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

editCustomerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  editCustomerSubmit();
})

/*
* Edit a distributor
*/

function editDistributor(event) {
  let distributorID = event.target.getAttribute('distributor');
  let distributor = DISTRIBUTOR_LIST.find(x => x.distributor_id === distributorID);
  console.log(`Editing distributor ${distributorID}`);
  switchLeftMenuItem({ target: { id: "edit-distributor-button", content: "edit-distributor" } });
  populateEditDistributorForm(distributor);
}

function populateEditDistributorForm(distributor) {
  populateLogo(document.getElementById("edit-distributor-logo-url"), distributor.config.LogoUrl);
  document.getElementById("edit-distributor-id").value = distributor.distributor_id;
  document.getElementById("edit-distributor-business-name").value = distributor.config.BusinessName;
  document.getElementById("edit-distributor-logo-url").innerText = distributor.config.LogoUrl;
  document.getElementById("edit-distributor-logo-css").innerText = distributor.config.LogoCss;
  document.getElementById("edit-distributor-file-host").value = distributor.config.FileHost ? distributor.config.FileHost : location.hostname;
}

const editDistributorForm = document.getElementById("edit-distributor-form");

async function editDistributorSubmit() {
  document.getElementById('edit-distributor-form-submit').disabled = true;
  const formData = new FormData(editDistributorForm);
  const inputData = Object.fromEntries(formData.entries());
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "update_distributor",
          ...inputData
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        displaySuccess("Distributor updated successfully");
        switchLeftMenuItem({ target: { id: "list-distributors-button", content: "list-distributors" } });
      } else {
        displayErrors("Failed to update distributor");
      }
    } else {
      displayErrors("Failed to update distributor");
      console.log(response.status, response.statusText);
    }
    document.getElementById('edit-distributor-form-submit').disabled = false;
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

editDistributorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  editDistributorSubmit();
})


const addUserForm = document.getElementById("add-user-form");

async function addUserSubmit() {
  document.getElementById('add-user-form-submit').disabled = true;
  const formData = new FormData(addUserForm);
  const userData = Object.fromEntries(formData.entries());
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "add_user",
          "distributor_id": DISTRIBUTOR_ID,
          ...userData
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        displaySuccess("User added successfully");
        switchLeftMenuItem({ target: { id: "manage-users-button", content: "manage-users" } });
      } else {
        displayErrors("Failed to add user");
      }
    } else {
      displayErrors("Failed to add user");
      console.log(response.status, response.statusText);
    }
    document.getElementById('add-user-form-submit').disabled = false;
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

addUserForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addUserSubmit();
})


async function listUsers() {
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "list_users",
          "distributor_id": DISTRIBUTOR_ID
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        let userList = document.getElementById('user-list');
        while (userList.firstChild) {
          userList.removeChild(userList.firstChild);
        }
        let users = JSON.parse(resBody.users);
        let ul = document.createElement('ul');
        for (let i = 0; i < users.length; i++) {
          let li = document.createElement('li')
          let link = document.createElement('a')
          link.setAttribute("href", "");
          link.innerText = "detach";
          link.addEventListener('click', detachUser);
          link.setAttribute("user_id", users[i].user_id);
          link.setAttribute("email", users[i].email);
          link.style.cursor = 'pointer';
          email = document.createElement('span');
          email.innerText = users[i].email;
          email.style.marginRight = '20px';
          li.appendChild(email);
          li.appendChild(link);
          ul.appendChild(li);
        }
        userList.appendChild(ul);
      }
      else {
        console.log("Failed to fetch user list");
      }
    } else {
      console.log("Failed to fetch user list");
      console.log(response.status, response.statusText);
    }
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

function detachUser(event) {
  let userID = event.target.getAttribute('user_id');
  let email = event.target.getAttribute('email');
  if (window.confirm(`Are you sure you want to detach "${email} from this distributor"?`)) {
    console.log(`Detaching user ${userID}`);
    detachUserConfirm(userID);
  }
}

async function detachUserConfirm(userID) {
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "detach_user",
          "distributor_id": DISTRIBUTOR_ID,
          "user_id": userID
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        console.log(`User ${userID} detached successfully`);
        switchLeftMenuItem({ target: { id: "manage-users-button", content: "manage-users" } });
      } else {
        console.log(`Failed to detach user ${userID}`);
      }
    } else {
      console.log(`Failed to detach user ${userID}`);
      console.log(response.status, response.statusText);
    }
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}
/* 
* Create a customer CSK
*/

const createCustomerForm = document.getElementById("create-customer-form");

async function createCustomer() {
  const formData = new FormData(createCustomerForm);
  const customerData = Object.fromEntries(formData.entries());
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "create_csk",
          "distributor_id": DISTRIBUTOR_ID,
          ...customerData
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        displaySuccess("Customer CSK created successfully");
        createCustomerForm.reset();
      } else {
        displayErrors("Failed to create customer CSK");
      }
    } else {
      displayErrors("Failed to create customer CSK");
      console.log(response.status, response.statusText);
    }
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

createCustomerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  createCustomer();
})

/* 
* Create a distributor
*/

const createDistributorForm = document.getElementById("create-distributor-form");

async function createDistributor() {
  const formData = new FormData(createDistributorForm);
  const inputData = Object.fromEntries(formData.entries());
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "create_distributor",
          ...inputData
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      console.log(resBody);
      if (resBody.result === "success") {
        displaySuccess("Distributor created successfully");
        createDistributorForm.reset();
      } else {
        displayErrors("Failed to create distributor");
      }
    } else {
      displayErrors("Failed to create distributor");
      console.log(response.status, response.statusText);
    }
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

createDistributorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  createDistributor();
})

/*
* Get stats
*/

let statsForm = document.getElementById('get-stats-form');

async function getDeploymentsSubmit() {
  getDataSubmit('deployments')
}
async function getActionsSubmit() {
  getDataSubmit('actions')
}

var saveData = (function () {
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  return function (blob, fileName) {
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };
}());

async function getDataSubmit(dataType) {
  document.getElementById(`get-${dataType}-submit`).disabled = true;
  let start_date = document.getElementById(`${dataType}-from`).value
  let end_date = document.getElementById(`${dataType}-to`).value
  try {
    const response = await fetch(STATISTICS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "data_type": dataType,
          "start_date": start_date,
          "end_date": end_date
        }
      )
    });
    if (response.ok) {
      const excelBlob = await response.blob();
      // var link = window.URL.createObjectURL(excelBlob);
      saveData(excelBlob, `${dataType}-${start_date}-${end_date}.csv`);
      // console.log(resBody);
      // if (resBody.result === "success") {
      //   displaySuccess(`Data retrieved successfully ${resBody.items}`);
      // } else {
      //   displayErrors(`Failed to get statistics: ${resBody.result}`);
      // }
    } else {
      displayErrors(`Failed to get statistics: ${response.statusText}`);
      console.log(response.status, response.statusText);
    }
    document.getElementById(`get-${dataType}-submit`).disabled = false;
  }
  catch (e) {
    if (confirm("API call failed, would you like to log back in?")) {
      location.reload()
    }
  }
}

document.getElementById('get-deployments-submit').addEventListener("click", (event) => {
  event.preventDefault();
  getDeploymentsSubmit();
})
document.getElementById('get-actions-submit').addEventListener("click", (event) => {
  event.preventDefault();
  getActionsSubmit();
})

/* 
* display errors 
*/
function displayErrors(error) {
  if (typeof error === 'object') {
    error = error.toString();
  }
  document.getElementById('general-errors').replaceChildren(document.createTextNode(error));
  document.getElementById('general-error-block').hidden = false;
  document.getElementById('content-view').style.filter = "blur(4px)";
}
function hideErrors() {
  document.getElementById('general-error-block').hidden = true;
  document.getElementById('general-errors').replaceChildren(document.createTextNode(""));
  document.getElementById('content-view').style.filter = "none";
}
function displaySuccess(message) {
  document.getElementById('general-success').replaceChildren(document.createTextNode(message));
  document.getElementById('general-success-block').hidden = false;
  document.getElementById('content-view').style.filter = "blur(4px)";
}
function hideSuccess() {
  document.getElementById('general-success-block').hidden = true;
  document.getElementById('general-success').replaceChildren(document.createTextNode(""));
  document.getElementById('content-view').style.filter = "none";
}

async function ping() {
  try {
    const response = await fetch(MANAGEMENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": ID_TOKEN
      },
      body: JSON.stringify(
        {
          "action": "ping",
        }
      )
    });
    if (response.ok) {
      const resBody = await response.json();
      if (resBody.result === "success") {
        console.log(resBody.response);
      }
      else {
        console.log(response.status, response.statusText, resBody);
      }
    }
  }
  catch (e) {
    location.reload()
  }
}

hideSuccess();
hideErrors();
populateDistributorOptions();

document.getElementById("hide-success").addEventListener("click", hideSuccess);
document.getElementById("hide-errors").addEventListener("click", hideErrors);
document.getElementById("hide-success-button").addEventListener("click", hideSuccess);
document.getElementById("hide-errors-button").addEventListener("click", hideErrors);
document.getElementById("about-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("create-distributor-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("list-distributors-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("create-customer-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("list-customers-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("reports-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("config-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("manage-users-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("logout").addEventListener("click", logout);