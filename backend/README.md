# IoT whatever

## Executing instructions

### Docker

- Build the docker container:

```bash
docker 
docker build -t python-app .
```

> Change the pythono-app to whatever tag name you wish

- Run the container:

```bash
docker run -p 5000:5000 python-app

```

> Use the tag name you used in the previous step

Now the server is running at `localhost:5000`
