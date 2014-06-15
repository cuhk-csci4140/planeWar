###########
# READ ME #
###########

# By default, this game uses port 4140 
# Change the host/IP in the files before deployment or the game won't work.
# You have to modify 3 files in order to get this game working.
# We recommend restarting the server regularly (once a day/week) because a main array holding up all connections will continue to grow (./source/server.php)
# restart the server program can free those memory.

####### FILE Modification ###########

# In file "./mobile/js/main.js"
# change line 3-5 accordingly to your server configuration

# In file "./planeWar/javascript/main.js"
# change line 5-7 accordingly to your server configuration

# In file "source/server.php"
# change line 2-3 accordingly to your server configuration


###### server start up ################

#start up the server by the command: 
php -q server.php

# located in ./source/server.php


