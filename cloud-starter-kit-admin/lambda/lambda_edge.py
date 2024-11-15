def lambda_handler(event, context):
    request = event["Records"][0]["cf"]["request"]
    print(request)
    if "/app" in request["uri"]:
        request["uri"] = request["uri"].replace("/app", "")
        request["headers"]["secret"] = [
            {"key": "secret", "value": "mZu!n*B@7E9H@iTycuxXWbWVo_"}
        ]
    # elif "/api-auth" in request["uri"]:
    #     request["uri"] = request["uri"].replace("/api-auth", "")
    #     request["headers"]["secret"] = [
    #         {"key": "secret", "value": "mZu!n*B@7E9H@iTycuxXWbWVo_"}
    #     ]
    elif "/api" in request["uri"]:
        request["uri"] = request["uri"].replace("/api", "")
        request["headers"]["secret"] = [
            {"key": "secret", "value": "mZu!n*B@7E9H@iTycuxXWbWVo_"}
        ]
    print(request)
    return request
