const Eris = require("eris");
const {prefix,channel_1_id,channel_2_id,ownerid,token,delete_messages,edit_messages}=require('./set.json');

const cs=[];
const createdHooks=new Map();
const createdMessages=new Map();

let uptime;
let initialized=false;

async function createWeb(channel) {
    if (channel) {
        try {
            const wbs=await channel.getWebhooks();
            let hook=wbs[0]||await channel.createWebhook(Object.assign({name: channel.name}));
            createdHooks.set(channel.id,hook); console.log(`Started webhook (channel) '${hook.name}' (${hook.id})`);
            return hook;
        } catch (error) {
            console.error(error)
        };
    };
};
async function sendMessage(interaction,webhook) {
    try {
        const file=typeof(interaction.attachments[0])!="undefined"?interaction.attachments[0].url:"";
        await bot.executeWebhook(webhook.id,webhook.token,Object.assign({
            content: `${interaction.content}\n${file}`
        },{
            username: `${interaction.author.username} (${interaction.channel.guild.name})`
        },{
            avatarURL: interaction.author.avatarURL
        },{wait: true}
        )).then(m=>createdMessages.set(interaction.id,m)).catch(async(e)=>{
            console.log(`Unable to send message from webhook, attempting to create a new webhook.\n${e}`);
            if (interaction.channel.type!=1) {
                for (const ca in cs) {
                    if (ca && interaction.channel.id===cs[ca].id && createdHooks.has(cs[(-ca)+1].id) ){
                        const wb= await createWeb(cs[(-ca)+1]);
                        if (!wb) {console.error(`Channel ${cs[(-ca)+1].id} is unavailable\nperhaps try checking if it exists or if I have permission to access it.`)}
                    };
                } return;
            } else {console.error("Channel type not supported");return;};});
        console.log('\x1b[33m%s\x1b[0m',`sent a message to '#${interaction.channel.name}' from ${interaction.author.username} (${interaction.author.id}, guild: '${interaction.channel.guild.name}')`);
    } catch (error) {
        console.error('Error trying to send a message: ', error);
    };
};
const bot = new Eris(token);

bot.on("ready", async() => {
    try {
        const server=bot.guilds.get(bot.channelGuildMap[channel_1_id]).channels;
        const server2=bot.guilds.get(bot.channelGuildMap[channel_2_id]).channels;
        if (initialized!=true) {
            cs.push(server.get(channel_1_id));cs.push(server2.get(channel_2_id));
            console.log(`Starting Channels: ${cs[0].id}, ${cs[1].id}`);uptime=Date.now();
            const c1=await createWeb(cs[0]);
            const c2=await createWeb(cs[1]);
            if (c2&&c1) {
                console.log(`Initialized!\nEditing messages: ${edit_messages}\nDeleting message: ${delete_messages}`);
                initialized=true;
            } else {
                console.error(`A/some channel(s) were not loaded correctly: channel 2:${typeof(c1)}, channel 1:${typeof(c2)}\nI'll still try to initialize.`)
                initialized=true;
            }
        } else {console.log(`Reconnection success`);};
    } catch(e) {
        console.error(`There was an error initializing: ${e}${(typeof cs[0]==="undefined"||typeof cs[1]==="undefined" )?"\ntry checking your channels":""}`);
    }
});

bot.on("messageCreate", async(interaction) => {
    if (interaction.author.bot && interaction.channel.type!=1) return;

    if (interaction.content.toLowerCase().startsWith(prefix) && interaction.author.id===ownerid) {
        const content=interaction.content.toLowerCase().replace(prefix,"").trim()
        if (content===`channel_1` || content===`channel_2`) {
            try {
                const cha=parseInt(content.substring(8))-1;
                if (cs[cha].id!=interaction.channel.id && cs[(-cha)+1].id!=interaction.channel.id) {
                    console.log('\x1b[33m%s\x1b[0m',`Changed channel from '#${cs[cha].name}' to '#${interaction.channel.name}' (${interaction.channel.id})`);
                    cs[cha]=interaction.channel;
                    await createWeb(cs[cha]);
                } else {
                    await bot.createMessage(interaction.channel.id,Object.assign({content: `**Invalid operation;**\n'${cs[cha].name}' is already channel ${cha+1}`},
                    {
                        messageReference: {
                            messageID: interaction.id
                        }
                    },
                    ));
                };
            } catch(err) {
                console.error('Error while changing channels: ', err);
            };
            return;
        }  else if (content==="stats") { 
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
            }));
            } catch(err) {
                console.error('Error while sending stats ', err);
            };return;
        };
    };

        for (const ca in cs) {
            if (ca && interaction.channel.id===cs[ca].id && createdHooks.has(cs[(-ca)+1].id) ){
                await sendMessage(interaction,createdHooks.get(cs[(-ca)+1].id));
            };
        };
});

if (delete_messages) {
    bot.on("messageDelete", async(interaction)=> {
        try {
            if (createdMessages.has(interaction.id)) {
                for (const ca in cs) {
                    if (ca&&createdHooks.has(cs[ca].id)&&createdMessages.get(interaction.id).channel.id===cs[ca].id) {
                        const hook=createdHooks.get(cs[ca].id)
                        const message=createdMessages.get(interaction.id);
                        await bot.deleteWebhookMessage(hook.id,hook.token,message.id).then(console.log('\x1b[33m%s\x1b[0m',`deleted a message from '${message.channel.name}' from ${interaction.author.username||"unavailable"} (${interaction.author.id||"unavailable"}, guild: '${message.channel.guild.name}')`)).catch(e=>console.log(e));
                    };
                };
            };
        } catch (error) {
            console.error("Error deleting message: ",error);
        };
    });
}
if (edit_messages) {
    bot.on("messageUpdate",async(interaction)=> {
        if (createdMessages.has(interaction.id)) {
            try {
                for (const ca in cs) {
                    if (ca&&createdHooks.has(cs[ca].id)&&createdMessages.get(interaction.id).channel.id===cs[ca].id) {
                        const hook=createdHooks.get(cs[ca].id);
                        const message=createdMessages.get(interaction.id);
                        await bot.editWebhookMessage(hook.id,hook.token,message.id,Object.assign({
                            content: interaction.content
                        },{
                            file: interaction.attachments[0]
                        })).then(console.log('\x1b[33m%s\x1b[0m',`edited a message from '${interaction.channel.name}' from ${interaction.author.username} (${interaction.author.id}, guild: '${interaction.channel.guild.name}')`)).catch(e=>console.error("Error editing message: ",e));
                    };
                };
            } catch (error) {
                console.error("Error editing message: ",error);
            };
        
        };
    });
}

bot.on("shardDisconnect",async(e,id)=>{
    console.error(`Shard ${id} disconnected with error:`,(typeof(e)!="undefined")?e:`(no error available)`);
});
bot.on("error",async(e,id)=>{
    console.error(`Shard ${id} experienced an error:`,(typeof(e)!="undefined")?e:`(no error available)`);
});

try {
    bot.connect();
} catch (error) {
    console.error(error);
};
