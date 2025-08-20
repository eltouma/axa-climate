GREEN := \e[32m
RESET :=\e[0m

all:
	command -v pnpm >/dev/null 2>&1 || npm install -g pnpm
	pnpm install
	pnpm start

start:
	pnpm start

clean:
	/bin/rm -rf node_modules
	@echo "\nnode_modules removed: $(GREEN)success$(RESET)\n"
fclean:	clean
	/bin/rm -rf node_modules

re: fclean all

.PHONY: all clean fclean re
