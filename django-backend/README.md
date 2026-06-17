# Chat App Backend

This is the Django Channels backend for the chat app.

## Deploy on Render

1. Create a free PostgreSQL database on Neon.
2. Create a new Render Web Service from this repository.
3. Set the root directory to `django-backend`.
4. Use the Render blueprint in `render.yaml` or set these values manually:
   - Build command: `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
   - Start command: `daphne -b 0.0.0.0 -p $PORT core.asgi:application`
5. Set these environment variables:
   - `DEBUG=False`
   - `SECRET_KEY=your-long-random-secret`
   - `ALLOWED_HOSTS=your-backend.onrender.com`
   - `DATABASE_URL=your-neon-postgres-url`
   - `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app`
   - `EMAIL_HOST_USER=your-email@gmail.com`
   - `EMAIL_HOST_PASSWORD=your-gmail-app-password`
   - `DEFAULT_FROM_EMAIL=your-email@gmail.com`

## Local development

1. Run `python manage.py migrate`.
2. Run `python manage.py runserver`.
3. Keep `DEBUG=True` and the default localhost settings for local testing.