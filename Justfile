test:
    pnpm run test:fast

test-full:
    pnpm test

test-watch:
    pnpm run test:watch

build:
    pnpm run build

polish:
    pnpm run lint

ci: polish test-full
