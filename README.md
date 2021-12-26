
Instance link: http://ec2-3-23-129-206.us-east-2.compute.amazonaws.com:3456/#

This chat service is a multi-room chat server using Node.JS and Socket.IO. It has a main lobby where users can sign on with a username and start chatting with other users, with the choice to send messages to entire chat room or a specific user. Users may also create public and private (password-protected) chat rooms for other to join. Creator status gives the user the ability to temporarily kick or permanently ban another user from their chatroom. The chat room lists the room you are in, all available rooms, and the users in the current room.

Other Features:

  - Users can delete rooms
      
      - Only creator of the room is granted permission to delete the room
      - Once deleted, all users currently within deleted room are removed and must select a new room to join
 
  - Creators of rooms can pass on creator status to another user of their choice
      
      - User must be in that room currently to complete the transfer of creator status

  - The chat is updated when a user joins or leaves the chat room
      



