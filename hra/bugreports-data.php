<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
$url = 'https://posledni-prezivsi-default-rtdb.europe-west1.firebasedatabase.app/bugReports.json';
echo file_get_contents($url);
