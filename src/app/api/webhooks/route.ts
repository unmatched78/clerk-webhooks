// import { Webhook } from 'svix'
// import { headers } from 'next/headers'
// import { WebhookEvent } from '@clerk/nextjs/server'
// import prisma from '@/lib/db'

// export async function POST(req: Request) {
//   const SIGNING_SECRET = process.env.SIGNING_SECRET

//   if (!SIGNING_SECRET) {
//     throw new Error('Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env.local')
//   }

//   // Create new Svix instance with secret
//   const wh = new Webhook(SIGNING_SECRET)

//   // Get headers
//   const headerPayload = await headers()
//   const svix_id = headerPayload.get('svix-id')
//   const svix_timestamp = headerPayload.get('svix-timestamp')
//   const svix_signature = headerPayload.get('svix-signature')

//   // If there are no headers, error out
//   if (!svix_id || !svix_timestamp || !svix_signature) {
//     return new Response('Error: Missing Svix headers', {
//       status: 400,
//     })
//   }

//   // Get body
//   const payload = await req.json()
//   const body = JSON.stringify(payload)

//   let evt: WebhookEvent

//   // Verify payload with headers
//   try {
//     evt = wh.verify(body, {
//       'svix-id': svix_id,
//       'svix-timestamp': svix_timestamp,
//       'svix-signature': svix_signature,
//     }) as WebhookEvent
//   } catch (err) {
//     console.error('Error: Could not verify webhook:', err)
//     return new Response('Error: Verification error', {
//       status: 400,
//     })
//   }

//   // Do something with payload
//   // For this guide, log payload to console
//   const { id } = evt.data
//   const eventType = evt.type
//   console.log(`Received webhook with ID ${id} and event type of ${eventType}`)
//   console.log('Webhook payload:', body)

//   if(evt.type === 'user.created') {
//     const { id, email_addresses, first_name, image_url } = evt.data
//     try {
//       const newUser = await prisma.user.create({
//         data: {
//           clerkUserId: id,
//           email: email_addresses[0].email_address,
//           name: first_name,
//           imageUrl: image_url,
//         }
//       });
//       return new Response(JSON.stringify(newUser), {
//         status: 201,
//       })
//     } catch(error) {
//       console.error('Error: Failed to store event in the database:', error)
//       return new Response('Error: Failed to store event in the database', {
//         status: 500,
//       });
//     }
//   }

//   return new Response('Webhook received', { status: 200 })
// }
import { Webhook } from 'svix';  
import { headers } from 'next/headers';  
import { WebhookEvent } from '@clerk/nextjs/server';  
import prisma from '@/lib/db';  

export async function POST(req: Request) {  
  const SIGNING_SECRET = process.env.SIGNING_SECRET;  

  if (!SIGNING_SECRET) {  
    throw new Error(  
      'Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env.local'  
    );  
  }  

  const wh = new Webhook(SIGNING_SECRET);  

  const headerPayload = headers();  
  const svix_id = headerPayload.get('svix-id');  
  const svix_timestamp = headerPayload.get('svix-timestamp');  
  const svix_signature = headerPayload.get('svix-signature');  

  if (!svix_id || !svix_timestamp || !svix_signature) {  
    return new Response('Error: Missing Svix headers', {  
      status: 400,  
    });  
  }  

  const payload = await req.text();  
  const body = payload;  

  let evt: WebhookEvent;  

  try {  
    evt = wh.verify(body, {  
      'svix-id': svix_id,  
      'svix-timestamp': svix_timestamp,  
      'svix-signature': svix_signature,  
    }) as WebhookEvent;  
  } catch (err) {  
    console.error('Error: Could not verify webhook:', err);  
    return new Response('Error: Verification error', {  
      status: 400,  
    });  
  }  

  const { id } = evt.data;  
  const eventType = evt.type;  
  console.log(`Received webhook with ID ${id} and event type of ${eventType}`);  
  console.log('Webhook payload:', body);  

  if (evt.type === 'user.created') {  
    const { id, email_addresses, first_name, image_url, username } = evt.data;  
    try {  
      const newUser = await prisma.user.create({  
        data: {  
          clerkUserId: id,  
          email: email_addresses[0].email_address,  
          name: first_name,  
          imageUrl: image_url,
          username: username || '',  // Provide a default empty string if null
        },  
      });  
      return new Response(JSON.stringify(newUser), {  
        status: 201,  
      });  
    } catch (error: any) {  
      console.error('Prisma error details:', JSON.stringify(error));  
      console.error('Prisma error message:', error.message);  
      console.error('Prisma error stack:', error.stack);  

      return new Response('Error: Failed to store event in the database', {  
        status: 500,  
      });  
    }  
  }  

  if (evt.type === 'user.updated') {  
    const { id, email_addresses, first_name, image_url, username } = evt.data;  
    try {  
      // Check if the user exists
      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId: id },
      });
  
      if (!existingUser) {
        return new Response('Error: User not found', {
          status: 404,  // Status 404 for not found
        });
      }
  
      // Update the user if they exist
      const updateUser = await prisma.user.update({  
        where: { clerkUserId: id },  // Ensure the user is identified by clerkUserId
        data: {  
          email: email_addresses[0].email_address,  
          name: first_name,  
          imageUrl: image_url,
          username: username || '',  // Provide a default empty string if null
        },  
      });  
      return new Response(JSON.stringify(updateUser), {  
        status: 200,  // Status 200 for successful update
      });  
    } catch (error: unknown) {  
      if (error instanceof Error) {
        console.error('Prisma error details:', JSON.stringify(error));  
        console.error('Prisma error message:', error.message);  
        console.error('Prisma error stack:', error.stack);  
      } else {
        console.error('Unexpected error:', error);
      }
  
      return new Response('Error: Failed to update user in the database', {  
        status: 500,  
      });  
    }  
  }

  return new Response('Webhook received', { status: 200 });  
}  