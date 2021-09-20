const {prefix, token, c1, c2, ownerid}=require('./set.json')
const { Client, Intents, TextChannel, Webhook, MessageEmbed, MessageAttachment }=require('discord.js')
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});

const cs=[];
const createdHooks =[];

var amount=0;
var sentMessages =[];

var busy=false;

async function createWeb(channel) {
    if (channel && channel.type==="GUILD_TEXT") { //forgot about this
    try {
        var w2bs = await channel.fetchWebhooks();
    } catch (error) {
        console.log("Error fetching webhooks: "+error);
        await channel.send("> An error occured while fetching this channels webhooks.")
        .catch(e=>console.log(e))
        return
    };

    const w1bs=w2bs.first();
    if (!w1bs) {
        try {
           const webhook = await channel.createWebhook(channel.name);
           createdHooks.push(webhook);
           console.log(`Started channel: ${channel.id} with a new webhook: '${channel.name}'`);
           return
        } catch (e) {
            console.error("Error sending webhook message: "+e);
            return
        }
    }
    console.log("Started channel: "+channel.id+" ("+channel.name+")");
    } else {
        await channel.send("> This channel type is not supported.")
        .catch(e=>console.log(e))
    };
}
async function saveWebhook(hook) {
    console.log("Attempted to send message to invalid webhook (perhaps it was deleted?)\nCreating new webhook...");
    try {
        await createWeb(hook);
        //await sendMessage(message,webhook);
    } catch (error) {
        console.error("Webhook save failed: "+error)
    };
}
async function sendMessage(interaction,webhook) {
    if (interaction!=webhook){
        try {
            if (interaction.attachments.size===0) {
                w=await webhook.send({
                    content: interaction.content,
                    username: `${interaction.author.username} (${interaction.channel.guild.name})`,
                    avatarURL: interaction.author.avatarURL()
                });
            } else {
                if (interaction.attachments.first().size<8000000) {
                    const file = new MessageAttachment(`${interaction.attachments.first().url}`);
                    if (interaction.content!="") {
                        w=await webhook.send({
                            content: interaction.content,
                            username: `${interaction.author.username} (${interaction.channel.guild.name})`,
                            avatarURL: interaction.author.avatarURL(),
                            files: [file]
                        });
                    } else {
                        w=await webhook.send({
                            username: `${interaction.author.username} (${interaction.channel.guild.name})`,
                            avatarURL: interaction.author.avatarURL(),
                            files: [file]
                        });
                    }
                } else {
                    w=await webhook.send({
                        content: `${interaction.content}\n${interaction.attachments.first().url}`,
                        username: `${interaction.author.username} (${interaction.channel.guild.name})`,
                        avatarURL: interaction.author.avatarURL()
                    });
                };
            }
            sentMessages[interaction.id]=w;
            amount=amount+1;
            console.log('\x1b[33m%s\x1b[0m',`sent a message to '${interaction.channel.name}' from ${interaction.author.username} (${interaction.author.id}, guild: '${interaction.channel.guild.name}')`);
        } catch (error) {
            console.error('Error trying to send a message: ', error);
        };
    }
}

client.once('ready', () => {
    client.user.setStatus("online");
    setInterval(() => {
        client.user.setActivity(amount.toString())
      }, 10000);

    cs.push(client.channels.cache.get(c1));
    cs.push(client.channels.cache.get(c2));
    console.log("Discord connection success\nStarting Channels: "+cs[0].id+" "+cs[1].id);  
    //init both channels
    createWeb(cs[0]);
    createWeb(cs[1]);

    
	client.on('messageCreate', async interaction => {
        if (interaction.author.bot) return;

        if (interaction.author.id===ownerid || interaction.author.id===interaction.guild.ownerID) { //check if user is permed
            if (interaction.author.id===ownerid && interaction.content===prefix+" shutdown") { //check if is commmand (to bottom)
                try {
                    busy=true; 
                    for (const hook of createdHooks) {
                        try {
                            hook.delete("Automatic deletion for shutdown"); 
                        } catch(e) {
                            console.error("Error deleting a webhook: "+e);
                        };
                    }
                    await interaction.delete()
                    .then(() => client.user.setStatus('invisible'))
                    .then(() => client.destroy());
                  } catch(err) {
                    console.error(err);             

                  }
            }else if (interaction.author.id===ownerid && interaction.content===prefix+" restart") {
                try {
                    busy=true  
                    await interaction.delete()
                     .then(() => client.destroy())
                     .then(() => client.login(token)) 
                  } catch(err) {
                    console.error("Error while restarting: "+err);         
                    await interaction.channel.send('> An error occured while restarting:\n'+err)            
                  }
                  busy=false;
            } else if (interaction.author.id===ownerid || interaction.author.id===interaction.guild.ownerID && interaction.content.startsWith(prefix)) {
                if (interaction.content===prefix+" channel_1" || interaction.content===prefix+" channel_2") {
                    busy=true  
                    try {
                        const cha=parseInt(interaction.content.replace(prefix,"").trim().substring(8))-1
                        if (cs[cha].id!=interaction.channel.id && cs[(-cha)+1].id!=interaction.channel.id) {
                            console.log("Changed channel from "+cs[cha].name+" to "+interaction.channel.name+" ("+interaction.channel.id+")")
                            cs[cha]=interaction.channel
                            await createWeb(cs[cha])
                        } else {
                            interaction.reply(`**You can't change this channel!**\n'${cs[cha].name}' is already channel ${cha+1}`)
                            .catch(err => console.error(err))
                        }
                    } catch(err) {
                        console.error('Error while changing channels: ', err);
                    };
                    busy=false;
                }
            }
        }
        if (busy===false) { // if no command is running, start fetching webhooks
            for (const ca in cs) {
                try {
                    const webhooks=await cs[(-ca)+1].fetchWebhooks();
                    var webhook=await webhooks.first();
                } catch (error) {
                    console.error("An error occured while indexing webhooks: "+error)
                };
                if (ca && interaction.channel.id===cs[ca].id && webhook) { // webhook is found, send message to contrary channel
                    await sendMessage(interaction,webhook);
                } else if (typeof webhook === 'undefined') { // fallback if webhook is not found 
                    await saveWebhook(cs[(-ca)+1]);
                };
                
            }    
        }
    });
    client.on('messageDelete', async (message) => {
        if (sentMessages[message.id] && busy===false) {
           await sentMessages[message.id].delete()
           .then(console.log('\x1b[33m%s\x1b[0m',`deleted a message from '${sentMessages[message.id].channel.name}' from ${message.author.username} (${message.author.id}, guild: '${message.channel.guild.name}')`))
           .catch(err=>console.error("Error while deleting message: "+err));
        }
    });
    client.on('messageUpdate',async (oldMessage,newMessage) => {
        if (sentMessages[oldMessage.id] && busy===false) {
            for (const ca in cs) {
                try {
                    const webhooks=await cs[(-ca)+1].fetchWebhooks();
                    var webhook=await webhooks.first();
                } catch (error) {
                    console.error("An error occured while indexing webhooks: "+error)
                };
                if (ca && newMessage.channel.id===cs[ca].id && webhook) {
                    await webhook.editMessage(sentMessages[newMessage.id],newMessage.content)
                    .then(console.log('\x1b[33m%s\x1b[0m',`edited a message from '${sentMessages[newMessage.id].channel.name}' from ${newMessage.author.username} (${newMessage.author.id}, guild: '${newMessage.channel.guild.name}')`))
                    .catch(err=>console.error("Error while editing message: "+err));
                } else if (typeof webhook === 'undefined') {
                    await saveWebhook(cs[(-ca)+1]);
                };
            }    
        }
    });
});

client.login(token);
//(-ca)+1
