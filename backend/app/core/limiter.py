"""
Shared SlowAPI limiter instance.
Import this singleton in main.py and every router that needs rate limiting.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)