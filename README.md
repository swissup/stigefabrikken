## Installation

Add following to repositories list on server and pull the files:

```json
cd <magento_root>
composer config repositories.theme-swissup-stigfabrikken vcs git@github.com:swissup/stigefabrikken.git
composer require swissup/stigefabrikken --no-dev
bin/magento setup:upgrade
```
