.SILENT:
all: makedirs npminstall configurator

npminstall:
	npm install

makedirs: logsdir configdir programsdir

logsdir:
	echo "Making logs directory";
	if [ -d "logs" ]; then \
		echo "Copy Canceled - logs directory already exists"; \
	else \
		mkdir logs; \
		echo "logs directory created"; \
	fi \

configdir:
	echo "Making config directory";
	if [ -d "config" ]; then \
	echo "Copy Canceled - config directory already exists"; \
	else \
		mkdir config; \
        echo "config directory created"; \
	fi \

programsdir:
	echo "Making programs directory";
	if [ -d "programs" ]; then \
	echo "Copy Canceled - programs directory already exists"; \
	else \
		mkdir programs; \
        echo "programs directory created"; \
	fi; \
	if [ -d "programs/scripts" ]; then \
	    echo "Copy Canceled - programs/scripts directory already exists"; \
    else \
        mkdir programs/scripts; \
        echo "programs/scripts directory created"; \
    fi; \

.PHONY : configurator
configurator:
	python configurator.py
