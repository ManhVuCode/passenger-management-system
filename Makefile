# MPMS — gói gọn lệnh chạy dev (delegate sang ./mpms).
#   make start | make api | make web | make pwa | make setup | make stop
.PHONY: start api web pwa setup stop
start: ; @./mpms start
api:   ; @./mpms api
web:   ; @./mpms web
pwa:   ; @./mpms pwa
setup: ; @./mpms setup
stop:  ; @./mpms stop
