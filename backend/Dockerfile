FROM python:3.12
WORKDIR /usr/local/app/api

COPY . .
RUN pip install uv
RUN uv sync

EXPOSE 5000

CMD [".venv/bin/uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "5000"]
