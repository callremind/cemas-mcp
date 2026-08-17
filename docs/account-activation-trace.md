# CallRemind MCP — Account Activation Tools (Sample)

The MCP server exposes four account-activation/auth tools that wrap the REST
API. All return the API's `{ ok, data }` envelope as JSON text.

| Tool | REST endpoint | Purpose |
|------|---------------|---------|
| `createNewUser` | `POST /v1/auth/create-new-user` | Email an activation OTP + ref (no account created yet) |
| `validateNewUser` | `GET /v1/auth/validate-new-user` | Verify OTP/ref and fully create the account |
| `loginUser` | `POST /v1/auth/login-user` | Sign in with email + password |
| `logoutUser` | `POST /v1/auth/logout-user` | Stateless sign-out |

These tools are **pre-auth** (no `x-api-key` required) — they run on a bare
axios client since the user has no API key until after activation.

---

## Sample trace (against local API)

### createNewUser
```
> { name: "createNewUser", arguments: { email: "testapiuser@callremind.my", name: "Test API User" } }
< {"ok":true,"data":{"email":"testapiuser@callremind.my","code_ref":"UC5VM9Yv",
    "message":"Activation code sent. Check your email for the OTP and reference.","email_sent":true}}
```

### validateNewUser
```
> { name: "validateNewUser", arguments: { ref: "UC5VM9Yv", otp: "722659", password: "Test@Pass123" } }
< {"ok":true,"data":{"user":{"id":"e57323a2-c534-4653-a234-f89ecba12723","email":"testapiuser@callremind.my"},
    "api_key":"suarify_e57323a2_...","message":"Account activated successfully."}}
```

### loginUser
```
> { name: "loginUser", arguments: { email: "testapiuser@callremind.my", password: "Test@Pass123" } }
< {"ok":true,"data":{"user":{"id":"e57323a2-...","email":"testapiuser@callremind.my"},
    "api_key":"suarify_e57323a2_..."}}
```

### logoutUser
```
> { name: "logoutUser", arguments: {} }
< {"ok":true,"data":{"message":"Signed out.","email":null}}
```

See the full REST trace with DB verification in the main repo:
`docs/account-activation-api-trace.md`.
