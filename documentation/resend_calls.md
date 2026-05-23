url: https://resend.com/docs/api-reference/emails

Send an email

```python
import resend

resend.api_key = "apikeyhere"

r = resend.Emails.send({
  "from": "email@email.dev",
  "to": "email@email.com",
  "subject": "Hello World",
  "html": "<p>Congrats on sending your <strong>first email</strong>!</p>"
})
```

send in batches
```python
import resend
from typing import List

resend.api_key = "re_xxxxxxxxx"

params: List[resend.Emails.SendParams] = [
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>",
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>",
  }
]

resend.Batch.send(params)
```

list of sent emails
```python
import resend

resend.api_key = "re_xxxxxxxxx"
resend.Emails.list()
```