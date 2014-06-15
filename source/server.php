<?php
$host = '124.244.96.21'; //host
$port = '4140'; //port
//$host = '223.255.151.218'; //host
//$host = '192.168.11.50'; //host

$null = NULL; //null var
$masterRmID = 0;
$clientRmPlayerMap = [];
//Create TCP/IP sream socket
$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
//reuseable port
socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);

//bind socket to specified host
socket_bind($socket, 0, $port);

//listen to port
socket_listen($socket);

//create & add listning socket to the list
$clients = array($socket);
$hosts = [];
//start endless loop, so that our script doesn't stop
while (true) {
	//manage multipal connections
	$changed = $clients;
	//returns the socket resources in $changed array
	socket_select($changed, $null, $null, 0, 10);
	
	//check for new socket
	if (in_array($socket, $changed)) {
		$socket_new = socket_accept($socket); //accpet new socket
		$clients[] = $socket_new; //add socket to client array
		 echo "new client\n";
		$header = socket_read($socket_new, 1024); //read data sent by the socket
		perform_handshaking($header, $socket_new, $host, $port); //perform websocket handshake
		
		socket_getpeername($socket_new, $ip); //get ip address of connected socket
		$response = mask(json_encode(array('type'=>'system', 'message'=>$ip.' connected'))); //prepare json data
		send_message($response); //notify all users about new connection
		
		//make room for new socket
		$found_socket = array_search($socket, $changed);
		unset($changed[$found_socket]);
	}
	
	//loop through all connected sockets
	foreach ($changed as $changed_socket) {	
		
		//check for any incomming data
		while(socket_recv($changed_socket, $buf, 1024, 0) >= 1)
		{
			$received_text = unmask($buf); //unmask data
			$tst_msg = json_decode($received_text); //json decode 
			if($tst_msg!=NULL){
				//$user_name = $tst_msg->name; //sender name
				
				//$user_color = $tst_msg->color; //color
				$type = $tst_msg->type;

				//echo "rmID:".$rmID."\n";
				if($type=="reconnect"){
					echo "reconnect\n";
					$rmID= $tst_msg->rmID;
					$hosts[$rmID]["host"] = $changed_socket;
					$response_text = mask(json_encode(array('type'=>'reconnectRe')));
					@socket_write($hosts[$rmID]["host"],$response_text,strlen($response_text));
					for($i=1;$i<=count($hosts[$rmID])-1;$i++){
						//echo "sent". $i."\n";
						//var_dump($hosts[$rmID]["player".$i]);
						//$response_text = mask(json_encode(array('type'=>'startGame')));
						$ret = @socket_write($hosts[$rmID]["player".$i],$response_text,strlen($response_text));
						if($ret==FALSE){	playerDC($rmID,$playerID);	}
					}
				}
				else if($type == "getRmID"){
					$rmID= $masterRmID;
					$masterRmID++;
					$hosts[$rmID]["host"] = $changed_socket;
					$response_text = mask(json_encode(array('type'=>'rmIDMsg', 'rmID'=>$rmID)));
					@socket_write($hosts[$rmID]["host"],$response_text,strlen($response_text));
				}

				else if ($type == "playerName"){
					$rmID = $tst_msg->rmID;
					$playerID = $tst_msg->playerID;
					$playerName = $tst_msg->playerName;
					$response_text = mask(json_encode(array('type'=>'playerName', 'rmID'=>$rmID, 'playerID'=>$playerID, 'playerName'=>$playerName)));
					@socket_write($hosts[$rmID]["host"],$response_text,strlen($response_text));
				}
				else if($type == "playerConnect"){  // player first connect
					$rmID = $tst_msg->rmID;
					$playerID = $tst_msg->playerID;
					$playerName = $tst_msg->playerName;
					if( $playerID == -1){
						$playerID = count($hosts[$rmID]);
						$hosts[$rmID]["player".$playerID] = $changed_socket;
					}
					echo "pName:" . $playerName."\n";
					//echo "playerID ".$playerID;
					$response_text = mask(json_encode(array('type'=>'playerConnect', 'rmID'=>$rmID, 'playerID'=>$playerID, 'playerName'=>$playerName)));
					@socket_write($hosts[$rmID]["host"],$response_text,strlen($response_text));

					$response_text = mask(json_encode(array('type'=>'playerConnect', 'rmID'=>$rmID, 'playerID'=>$playerID)));
					$ret = @socket_write($hosts[$rmID]["player".$playerID],$response_text,strlen($response_text));
					if($ret==FALSE){	playerDC($rmID,$playerID);	}
					//echo $rmID. " ". $playerID."\n";
					//var_dump($hosts[$rmID]["player".$playerID]);
				}
				else if ($type=="startGame"){
					$rmID = $tst_msg->rmID;
					//echo $rmID;
					for($i=1;$i<=count($hosts[$rmID])-1;$i++){
						//echo "sent". $i."\n";
						//var_dump($hosts[$rmID]["player".$i]);
						$response_text = mask(json_encode(array('type'=>'startGame')));
						$ret = @socket_write($hosts[$rmID]["player".$i],$response_text,strlen($response_text));
						if($ret==FALSE){	playerDC($rmID,$playerID);	}
					}
				}
				else if ($type=="fire"){
					$rmID = $tst_msg->rmID;
					$playerID = $tst_msg->playerID;
					$response_text = mask(json_encode(array('type'=>'fire')));
					$ret = @socket_write($hosts[$rmID]["player".$playerID],$response_text,strlen($response_text));
					if($ret==FALSE){	playerDC($rmID,$playerID);	}
					//}
				}else if ($type=="roomPlane"){
					$rmID = $tst_msg->rmID;
					$planeArr = $tst_msg->planeArr;
					$response_text = mask(json_encode(array('type'=>'roomPlane', 'planeArr'=>$planeArr)));
					for($i=1;$i<=count($hosts[$rmID]);$i++){
						$ret = @socket_write($hosts[$rmID]["player".$i],$response_text,strlen($response_text));
						if($ret==FALSE){	playerDC($rmID,$playerID);	}
					}
				}
				else if ($type=="choosePlane"){
					$rmID = $tst_msg->rmID;
					$playerID = $tst_msg->playerID;
					$planeNo = $tst_msg->planeNo;
					//echo "pID: ". $playerID . "\n";
					$response_text = mask(json_encode(array('type'=>'choosePlane', 'playerID'=>$playerID, 'planeNo'=>$planeNo)));
					//for($i=1;$i<=count($hosts[$rmID]);$i++){
					@socket_write($hosts[$rmID]["host"],$response_text,strlen($response_text));

					//}
				}else if ($type=="onHit" || $type == "onHitCritical" || $type == "dead"){
					$rmID = $tst_msg->rmID;
					$playerID = $tst_msg->playerID;
					//echo "type: ".$type. " ". $playerID ."\n";
					$response_text = mask(json_encode(array('type'=>$type)));
					//for($i=1;$i<=count($hosts[$rmID]);$i++){
					@socket_write($hosts[$rmID]["player".$playerID],$response_text,strlen($response_text));

					//}
				}else if ($type=="restart"){
					$rmID = $tst_msg->rmID;
					$response_text = mask(json_encode(array('type'=>'restart')));
					for($i=1;$i<=count($hosts[$rmID]);$i++){
						$ret = @socket_write($hosts[$rmID]["player".$i],$response_text,strlen($response_text));
						if($ret==FALSE){	playerDC($rmID,$playerID);	}
					}
				}
				else {
					$rmID = $tst_msg->rmID;
					$host = $tst_msg->host;
					$fire = $tst_msg->fire;
					$power = $tst_msg->power;
					$direction = $tst_msg->direction;
					$playerID = $tst_msg->playerID;
					$user_message = $tst_msg->message; //message text
					$response_text = mask(json_encode(array('type'=>'controlData', 'rmID'=>$rmID, 'host'=>$host, 'playerID'=>$playerID, 'fire'=>$fire,'power'=>$power,'direction'=>$direction)));
					$ret = @socket_write($hosts[$rmID]["host"],$response_text,strlen($response_text));
					if($ret==FALSE){	playerDC($rmID,$playerID);	}
				}
				$type = "";
				//prepare data to be sent to client
	
			}
			break 2; //exist this loop
		}
		
		$buf = @socket_read($changed_socket, 1024, PHP_NORMAL_READ);
		if ($buf === false) { // check disconnected client
			// remove client for $clients array
			$found_socket = array_search($changed_socket, $clients);
			//socket_getpeername($changed_socket, $ip);
			unset($clients[$found_socket]);
			echo "client dc";
			//notify all users about disconnected connection
			//$response = mask(json_encode(array('type'=>'system', 'message'=>$ip.' disconnected')));
			//send_message($response);
		}
	}
}
// close the listening socket
socket_close($sock);

function send_message($msg)
{
	global $clients;
	foreach($clients as $changed_socket)
	{
		@socket_write($changed_socket,$msg,strlen($msg));
	}
	return true;
}
function playerDC($rmID,$playerID){

	$response_text = mask(json_encode(array('type'=>'playerDC', 'rmID'=>$rmID, 'playerID'=>$playerID)));
	@socket_write($hosts[$rmID],$response_text,strlen($response_text));
}

//Unmask incoming framed message
function unmask($text) {
	$length = ord($text[1]) & 127;
	if($length == 126) {
		$masks = substr($text, 4, 4);
		$data = substr($text, 8);
	}
	elseif($length == 127) {
		$masks = substr($text, 10, 4);
		$data = substr($text, 14);
	}
	else {
		$masks = substr($text, 2, 4);
		$data = substr($text, 6);
	}
	$text = "";
	for ($i = 0; $i < strlen($data); ++$i) {
		$text .= $data[$i] ^ $masks[$i%4];
	}
	return $text;
}

//Encode message for transfer to client.
function mask($text)
{
	$b1 = 0x80 | (0x1 & 0x0f);
	$length = strlen($text);
	
	if($length <= 125)
		$header = pack('CC', $b1, $length);
	elseif($length > 125 && $length < 65536)
		$header = pack('CCn', $b1, 126, $length);
	elseif($length >= 65536)
		$header = pack('CCNN', $b1, 127, $length);
	return $header.$text;
}

//handshake new client.
function perform_handshaking($receved_header,$client_conn, $host, $port)
{
	$headers = array();
	$lines = preg_split("/\r\n/", $receved_header);
	foreach($lines as $line)
	{
		$line = chop($line);
		if(preg_match('/\A(\S+): (.*)\z/', $line, $matches))
		{
			$headers[$matches[1]] = $matches[2];
		}
	}

	$secKey = $headers['Sec-WebSocket-Key'];
	$secAccept = base64_encode(pack('H*', sha1($secKey . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
	//hand shaking header
	$upgrade  = "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" .
	"Upgrade: websocket\r\n" .
	"Connection: Upgrade\r\n" .
	"WebSocket-Origin: $host\r\n" .
	"WebSocket-Location: ws://$host:$port/demo/shout.php\r\n".
	"Sec-WebSocket-Accept:$secAccept\r\n\r\n";
	socket_write($client_conn,$upgrade,strlen($upgrade));
}
