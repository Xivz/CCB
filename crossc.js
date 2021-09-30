const Eris = require("eris");
const {prefix,c1,c2,ownerid,token}=require('./set.json')

const cs=[];
const createdHooks=new Map();
const createdMessages=new Map();

async function createWeb(channel) {
    if (channel&&channel.type===0) {
        try {
            const wbs=await channel.getWebhooks();
            let hook=wbs[0]||channel.createWebhook();
            createdHooks.set(channel.id,hook);
            return hook
        } catch (error) {
            console.error(error)
        }
    }
}
async function sendMessage(interaction,webhook) {
    try {
        var file=""
        if (interaction.attachments[0]){file=interaction.attachments[0].url}
        await bot.executeWebhook(webhook.id,webhook.token,Object.assign({
            content: `${interaction.content}\n${file}`
        },{
            username: `${interaction.author.username} (${interaction.channel.guild.name})`
        },{
            avatarURL: interaction.author.avatarURL
        },{wait: true}
        )).then(m=>createdMessages.set(interaction.id,m))
        console.log('\x1b[33m%s\x1b[0m',`sent a message to '#${interaction.channel.name}' from ${interaction.author.username} (${interaction.author.id}, guild: '${interaction.channel.guild.name}')`);
    } catch (error) {
        console.error('Error trying to send a message: ', error);
    }
}
const bot = new Eris(token);
bot.on("ready", () => {
    try {
        const server=bot.guilds.get(bot.channelGuildMap[c1]).channels;
        cs.push(server.get(c1));
        cs.push(server.get(c2));
        console.log("Discord connection success\nStarting Channels: " + cs[0].id + " " + cs[1].id);var uptime=Date.now()
        //init both channels
        createWeb(cs[0]);
        createWeb(cs[1]);
    } catch(e) {
        console.error("There was an error initializing:");
        if (typeof cs[0]==="undefined"||typeof cs[1]==="undefined" ) {
            console.error(e+"\nperhaps try checking your channels");
        } else {
            console.error(e);
        } return
    }

    bot.on("messageCreate", async(interaction) => {
        if (interaction.author.bot) return;

        if (interaction.content.startsWith(prefix) && interaction.author.id===ownerid) {
            if (interaction.content===prefix+" channel_1" || interaction.content===prefix+" channel_2") {
                try {
                    const cha=parseInt(interaction.content.replace(prefix,"").trim().substring(8))-1
                    if (cs[cha].id!=interaction.channel.id && cs[(-cha)+1].id!=interaction.channel.id) {
                        console.log("Changed channel from "+cs[cha].name+" to "+interaction.channel.name+" ("+interaction.channel.id+")")
                        cs[cha]=interaction.channel
                        await createWeb(cs[cha])
                    } else {
                        bot.createMessage(interaction.channel.id,Object.assign({ content: `**You can't change this channel!**\n'${cs[cha].name}' is already channel ${cha+1}`},
                        {
                            messageReference: {
                                messageID: interaction.id
                            }
                        },
                        ));
                    }
                } catch(err) {
                    console.error('Error while changing channels: ', err);
        
                };
                return;
            }  else if (interaction.content.replace(prefix,"").trim()==="stats") { 
                try {
                   await bot.createMessage(interaction.channel.id,Object.assign({
                       messageReference: {
                           messageID: interaction.id
                       }
                   },
                   {
                    embed: {
                        color: 3447003,
                        title: "CCB Stats:",
                        fields: [
                            {
                                name: 'Uptime:',
                                value: `${Math.round((Date.now()-uptime)/60000)} minute(s)`,
                                inline: true
                            },
                            {
                                name: 'Shard Latency:',
                                value: `${bot.shards.get(0).latency}ms`,
                                inline: true
                            },
                            {
                                name: 'Messages Sent:',
                                value: `${createdMessages.size}`,
                                inline: true
                            },
                            {
                                name: 'Channel 1:',
                                value: `'${cs[0].name}' (${cs[0].id})`,
                                inline: false
                            },
                            {
                                name: 'Channel 2:',
                                value: `'${cs[1].name}' (${cs[1].id})`,
                                inline: false
                            },
                        ],
                        timestamp: new Date()
                    }
                }))
                } catch(err) {
                    console.error('Error while sending stats ', err);
                }; 
                return;
            }
        }

            for (const ca in cs) {
                if (ca && interaction.channel.id===cs[ca].id && createdHooks.has(cs[(-ca)+1].id) ){
                    await sendMessage(interaction,createdHooks.get(cs[(-ca)+1].id));
                }
            }
    });

    bot.on("messageDelete", async(interaction)=> {
        try {
            if (createdMessages.has(interaction.id)) {
                for (const ca in cs) {
                    if (ca&&createdHooks.has(cs[ca].id)&&createdMessages.get(interaction.id).channel.id===cs[ca].id) {
                        const hook=createdHooks.get(cs[ca].id);
                        const message=createdMessages.get(interaction.id);
                        await bot.deleteWebhookMessage(hook.id,hook.token,message.id).then(console.log('\x1b[33m%s\x1b[0m',`deleted a message from '${message.channel.name}' from ${interaction.author.username||"unavailable"} (${interaction.author.id||"unavailable"}, guild: '${message.channel.guild.name}')`)).catch(e=>console.log(e))
                    }
                }
            }
        } catch (error) {
            console.error("Error deleting message: ",error)
        }
    });
    bot.on("messageUpdate",async(interaction,preinteraction)=> {
        if (typeof(interaction && preinteraction)!="undefined"&&createdMessages.has(interaction.id)) {
            try {
                for (const ca in cs) {
                    if (ca&&createdHooks.has(cs[ca].id)&&createdMessages.get(interaction.id).channel.id===cs[ca].id) {
                        const hook=createdHooks.get(cs[ca].id);
                        const message=createdMessages.get(interaction.id);
                        await bot.editWebhookMessage(hook.id,hook.token,message.id,Object.assign({
                            content: interaction.content
                        },{
                            file: interaction.attachments[0]
                        })).then(console.log('\x1b[33m%s\x1b[0m',`edited a message from '${interaction.channel.name}' from ${interaction.author.username} (${interaction.author.id}, guild: '${interaction.channel.guild.name}')`)).catch(e=>console.error("Error editing message: ",error));
                    }
                }
            } catch (error) {
                console.error("Error editing message: ",error);
            }
        
        }
    });
});

try {
    bot.connect();
} catch (error) {
    console.error(error);
};
