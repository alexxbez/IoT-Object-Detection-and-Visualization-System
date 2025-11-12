FROM python:3.12
WORKDIR /usr/local/app/api

COPY . .
RUN pip install uv
RUN uv sync

EXPOSE 5000

CMD ["fastapi", "dev", "main.py"]
