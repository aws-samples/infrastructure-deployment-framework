
function runSdkCommand() {
    document.getElementById('sdk-output').hidden = false;
    try {
        switch (document.getElementById('sdk-commands-list').value) {
            case "list-buckets":
                window.listBuckets(function (err, data) {
                    if (err) {
                        document.getElementById('sdk-result').innerText = preformatted(err, true);
                    } else {
                        console.log("Success", data);
                        let output = "";
                        for (let i = 0; i < data.Buckets.length; i++) {
                            output += "* " + data.Buckets[i].Name + "<br>\n";
                        }
                        document.getElementById('sdk-result').innerText = preformatted(output, false);
                    }
                })
                break;
            case "list-subnets":
                window.getSubnets(function (err, data) {
                    if (err) {
                        console.log("Error", err);
                        document.getElementById('sdk-result').innerText = preformatted(err, true);
                    } else {
                        console.log("Success", data);
                        let output = "";
                        for (let i = 0; i < data.Subnets.length; i++) {
                            output += "* " + data.Subnets[i].SubnetId + " | " + data.Subnets[i].VpcId + " | " + data.Subnets[i].CidrBlock + " | " + data.Subnets[i].AvailabilityZone + "<br>\n";
                        }
                        document.getElementById('sdk-result').innerText = preformatted(output, false);
                    }
                })
                break;
            case "get-credential-report":
                window.getCredentialReport(function (err, data) {
                    if (err) {
                        console.log("Error", err);
                        document.getElementById('sdk-result').innerText = preformatted(err, true);
                    } else {
                        console.log("Success", data);
                        let decodedData = new TextDecoder("utf-8").decode(data.Content).replace(/[<>]/g, '');
                        let lines = decodedData.split("\n");
                        let fields = lines[0].split(",");
                        let values = lines[1].split(",");
                        let output = {};
                        for (let i = 0; i < fields.length; i++) {
                            output[fields[i]] = values[i]
                        }
                        document.getElementById('sdk-result').innerText = preformatted(output, true);
                    }
                })
                break;
            case "get-cloudfront-prefix-list":
                window.getPrefixLists({
                    Filters: [{
                        Name: "prefix-list-name",
                        Values: ["com.amazonaws.global.cloudfront.origin-facing"]
                    }]
                }, function (err, data) {
                    if (err) {
                        console.log("Error", err);
                        document.getElementById('sdk-result').innerText = preformatted(err, true);
                    } else {
                        console.log("Success", data);
                        document.getElementById('sdk-result').innerText = preformatted(data, true);
                    }
                })
                break;
        }
    } catch (err) {
        console.log("Error", err);
        document.getElementById('sdk-result').innerText = preformatted(err, true);
    }
}

function preformatted(data, bool) {
    console.log(typeof data);
    console.log(data instanceof String);
    if (bool) {
        document.getElementById('sdk-result').classList.add('pre');
        if (data.toString() === '[object Object]') {
            return JSON.stringify(data, null, 4);
        }
        else {
            return data;
        }
    } else {
        document.getElementById('sdk-result').classList.remove('pre');
        return data;
    }
}
document.getElementById("execute-sdk-button").addEventListener("click", runSdkCommand);
