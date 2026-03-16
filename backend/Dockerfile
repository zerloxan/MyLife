FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY app/ ${LAMBDA_TASK_ROOT}/app/

CMD ["app.main.handler"]
