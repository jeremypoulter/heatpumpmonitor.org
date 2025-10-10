<?php
$dir = dirname(__FILE__);
chdir("$dir/www");

define('EMONCMS_EXEC', 1);
require "Lib/load_database.php";
require "Lib/dbschemasetup.php";

$schema = array();

require "Modules/user/user_schema.php";
require "Modules/system/system_schema.php";
require "Modules/heatpump/heatpump_schema.php";
require "Modules/installer/installer_schema.php";
require "Modules/manufacturer/manufacturer_schema.php";
print json_encode(db_schema_setup($mysqli, $schema, true))."\n";
