import express, { Request, Response } from "express";
import * as dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.get('/', (_req: Request, res: Response) => {
    res.redirect('/home');
});

router.get('/home', (_req: Request, res: Response) => {
    res.render('index', {
        title: 'UnLocked',
    });
});

export default router;